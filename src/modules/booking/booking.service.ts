import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  BookingType,
  PaymentStatus,
  Prisma,
  RefundStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ActivityLogService } from '../activity/activity-log.service';
import { RoomAvailabilityService } from '../room-availability/room-availability.service';
import { AuthenticatedUser } from '../../common/guards/jwt-auth.guard';
import { generateBookingCode } from '../../shared/utils/booking-code';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ListBookingsDto } from './dto/list-bookings.dto';
import { paginate } from '../../shared/utils/pagination';

/**
 * Chính sách hoàn tiền mặc định khi hủy Booking đã CONFIRMED (xem specs/refund.md mục 3) —
 * tính theo số ngày từ lúc hủy tới ngày sử dụng sớm nhất (BookingItem.date nhỏ nhất).
 * Đây là giá trị mặc định toàn hệ thống (chưa đọc theo cancellationPolicy dạng text tự do
 * của từng Property), người dùng đã xác nhận dùng mốc chuẩn ngành: >=3 ngày=100%, 1-3 ngày=50%,
 * <1 ngày=0%. Có thể chỉnh lại nếu sau này cần chính sách theo từng Property.
 */
const REFUND_POLICY = [
  { minDaysBefore: 3, percent: 100 },
  { minDaysBefore: 1, percent: 50 },
  { minDaysBefore: 0, percent: 0 },
] as const;

const BOOKING_SELECT = {
  id: true,
  bookingCode: true,
  userId: true,
  partnerId: true,
  type: true,
  status: true,
  guestName: true,
  guestEmail: true,
  guestPhone: true,
  subtotal: true,
  discount: true,
  tax: true,
  total: true,
  paymentStatus: true,
  createdAt: true,
  updatedAt: true,
  items: {
    select: {
      id: true,
      resourceId: true,
      name: true,
      quantity: true,
      date: true,
      price: true,
      currency: true,
    },
  },
  payments: {
    select: { id: true, provider: true, status: true, amount: true, paidAt: true, createdAt: true },
    orderBy: { createdAt: 'desc' as const },
  },
  refunds: {
    select: { id: true, amount: true, reason: true, status: true, createdAt: true },
    orderBy: { createdAt: 'desc' as const },
  },
} satisfies Prisma.BookingSelect;

@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
    private readonly roomAvailability: RoomAvailabilityService,
  ) {}

  async create(dto: CreateBookingDto, user: AuthenticatedUser) {
    const room = await this.prisma.room.findFirst({
      where: { id: BigInt(dto.roomId), deletedAt: null },
      select: {
        id: true,
        name: true,
        currency: true,
        property: { select: { id: true, partnerId: true, status: true, deletedAt: true } },
      },
    });
    if (!room || room.property.status !== 'ACTIVE' || room.property.deletedAt) {
      throw new NotFoundException('Room not found');
    }

    const nights = this.buildNightDates(dto.checkIn, dto.checkOut);

    const availabilities = await this.prisma.roomAvailability.findMany({
      where: { roomId: room.id, date: { in: nights } },
      select: { date: true, price: true, available: true },
    });
    if (availabilities.length !== nights.length) {
      throw new BadRequestException('Room is not available for one or more selected dates');
    }
    const priceByDate = new Map(availabilities.map((a) => [a.date.toISOString(), a.price]));

    const bookingCode = await this.generateUniqueBookingCode();
    const subtotal = nights.reduce((sum, date) => {
      const price = priceByDate.get(date.toISOString());
      return price ? sum + Number(price) * dto.quantity : sum;
    }, 0);

    const booking = await this.prisma.$transaction(async (tx) => {
      for (const date of nights) {
        const ok = await this.roomAvailability.decrementAvailability(
          tx,
          room.id,
          date,
          dto.quantity,
        );
        if (!ok) {
          throw new BadRequestException(
            `Not enough availability on ${date.toISOString().slice(0, 10)}`,
          );
        }
      }

      const created = await tx.booking.create({
        data: {
          bookingCode,
          userId: BigInt(user.id),
          partnerId: room.property.partnerId,
          type: BookingType.HOTEL,
          status: BookingStatus.PAYMENT_PENDING,
          guestName: dto.guestName,
          guestEmail: dto.guestEmail,
          guestPhone: dto.guestPhone,
          subtotal,
          discount: 0,
          tax: 0,
          total: subtotal,
          paymentStatus: PaymentStatus.UNPAID,
          items: {
            create: nights.map((date) => ({
              resourceId: room.id,
              name: room.name,
              quantity: dto.quantity,
              date,
              price: priceByDate.get(date.toISOString())!,
              currency: room.currency,
            })),
          },
          payments: {
            create: {
              userId: BigInt(user.id),
              amount: subtotal,
              currency: room.currency,
            },
          },
        },
        select: BOOKING_SELECT,
      });

      return created;
    });

    await this.activityLog.log({
      actorId: BigInt(user.id),
      action: 'booking.created',
      resourceType: 'BOOKING',
      resourceId: booking.id,
    });

    return booking;
  }

  async findMine(user: AuthenticatedUser, query: ListBookingsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.BookingWhereInput = {
      userId: BigInt(user.id),
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, totalItems] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        select: BOOKING_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return paginate(items, page, limit, totalItems);
  }

  async findForPartner(user: AuthenticatedUser, query: ListBookingsDto) {
    const partner = await this.prisma.partner.findFirst({
      where: { ownerId: BigInt(user.id), deletedAt: null },
      select: { id: true },
    });
    if (!partner) {
      throw new ForbiddenException('You do not have a Partner profile');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.BookingWhereInput = {
      partnerId: partner.id,
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, totalItems] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        select: BOOKING_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return paginate(items, page, limit, totalItems);
  }

  async findAllForAdmin(query: ListBookingsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.BookingWhereInput = query.status ? { status: query.status } : {};

    const [items, totalItems] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        select: BOOKING_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return paginate(items, page, limit, totalItems);
  }

  async findOne(id: bigint, user: AuthenticatedUser) {
    const booking = await this.prisma.booking.findUnique({ where: { id }, select: BOOKING_SELECT });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    await this.assertCanView(booking, user);

    return booking;
  }

  async cancel(id: bigint, user: AuthenticatedUser) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        partnerId: true,
        status: true,
        paymentStatus: true,
        total: true,
        items: { select: { resourceId: true, date: true, quantity: true } },
        payments: {
          where: { status: 'SUCCESS' },
          select: { id: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const isOwner = booking.userId === BigInt(user.id);
    const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('You cannot cancel this booking');
    }

    if (
      booking.status !== BookingStatus.PENDING &&
      booking.status !== BookingStatus.PAYMENT_PENDING &&
      booking.status !== BookingStatus.CONFIRMED
    ) {
      throw new BadRequestException('Booking cannot be cancelled from its current status');
    }

    const earliestDate = booking.items.reduce<Date | null>((min, item) => {
      if (!item.date) return min;
      return !min || item.date < min ? item.date : min;
    }, null);
    const refundPercent = this.resolveRefundPercent(earliestDate);

    await this.prisma.$transaction(async (tx) => {
      for (const item of booking.items) {
        if (item.date) {
          await this.roomAvailability.incrementAvailability(
            tx,
            item.resourceId,
            item.date,
            item.quantity,
          );
        }
      }

      await tx.booking.update({ where: { id }, data: { status: BookingStatus.CANCELLED } });

      if (booking.paymentStatus === PaymentStatus.PAID && booking.payments[0]) {
        const amount = (Number(booking.total) * refundPercent) / 100;
        await tx.refund.create({
          data: {
            bookingId: id,
            paymentId: booking.payments[0].id,
            amount,
            reason: 'Booking cancelled',
            status: refundPercent > 0 ? RefundStatus.PROCESSING : RefundStatus.COMPLETED,
          },
        });
      }
    });

    await this.activityLog.log({
      actorId: BigInt(user.id),
      action: 'booking.cancelled',
      resourceType: 'BOOKING',
      resourceId: id,
      metadata: { refundPercent },
    });

    return this.prisma.booking.findUnique({ where: { id }, select: BOOKING_SELECT });
  }

  /**
   * Tự động hủy Booking giữ chỗ quá hạn chưa thanh toán (booking.md mục 3: "giữ PENDING/PAYMENT_PENDING
   * quá thời gian giữ chỗ phải tự động hủy + hoàn tồn kho"). Gọi định kỳ từ BookingSchedulerService.
   * Không cần tạo Refund (luôn UNPAID ở nhánh này — đã CONFIRMED/PAID thì không còn PENDING/PAYMENT_PENDING).
   */
  async cancelExpiredBookings(olderThanMinutes: number): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000);

    const expired = await this.prisma.booking.findMany({
      where: {
        status: { in: [BookingStatus.PENDING, BookingStatus.PAYMENT_PENDING] },
        createdAt: { lt: cutoff },
      },
      select: {
        id: true,
        items: { select: { resourceId: true, date: true, quantity: true } },
      },
    });

    let cancelledCount = 0;
    for (const booking of expired) {
      const cancelled = await this.prisma.$transaction(async (tx) => {
        // Claim atomic — chỉ tiếp tục nếu chính lần gọi này thực sự chuyển được trạng thái.
        // Chống double-process khi cancelExpiredBookings được gọi đồng thời (nhiều instance
        // Backend cùng chạy Cron, hoặc nhiều job chồng lấn) — nếu không có claim này, 2 lần gọi
        // cùng đọc thấy status còn PENDING sẽ cùng hoàn tồn kho, cộng dồn sai available.
        const claim = await tx.booking.updateMany({
          where: {
            id: booking.id,
            status: { in: [BookingStatus.PENDING, BookingStatus.PAYMENT_PENDING] },
          },
          data: { status: BookingStatus.CANCELLED },
        });
        if (claim.count === 0) {
          return false;
        }

        for (const item of booking.items) {
          if (item.date) {
            await this.roomAvailability.incrementAvailability(
              tx,
              item.resourceId,
              item.date,
              item.quantity,
            );
          }
        }
        return true;
      });

      if (cancelled) {
        cancelledCount += 1;
        await this.activityLog.log({
          action: 'booking.cancelled',
          resourceType: 'BOOKING',
          resourceId: booking.id,
          metadata: { reason: 'expired_hold' },
        });
      }
    }

    return cancelledCount;
  }

  private resolveRefundPercent(usageDate: Date | null): number {
    if (!usageDate) return 0;

    const daysBefore = (usageDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    const tier = REFUND_POLICY.find((t) => daysBefore >= t.minDaysBefore);
    return tier?.percent ?? 0;
  }

  private buildNightDates(checkIn: string, checkOut: string): Date[] {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
      throw new BadRequestException('checkOut must be after checkIn');
    }

    const nights: Date[] = [];
    for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) {
      nights.push(new Date(d));
    }
    return nights;
  }

  private async generateUniqueBookingCode(): Promise<string> {
    let candidate = generateBookingCode();
    while (
      await this.prisma.booking.findUnique({
        where: { bookingCode: candidate },
        select: { id: true },
      })
    ) {
      candidate = generateBookingCode();
    }
    return candidate;
  }

  private async assertCanView(
    booking: { userId: bigint; partnerId: bigint },
    user: AuthenticatedUser,
  ): Promise<void> {
    if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) {
      return;
    }
    if (booking.userId === BigInt(user.id)) {
      return;
    }

    const partner = await this.prisma.partner.findFirst({
      where: { ownerId: BigInt(user.id), deletedAt: null },
      select: { id: true },
    });
    if (partner && partner.id === booking.partnerId) {
      return;
    }

    throw new ForbiddenException('You do not have access to this booking');
  }
}
