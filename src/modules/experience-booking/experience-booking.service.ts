import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingDomain,
  BookingStatus,
  ExperienceStatus,
  Prisma,
  ProviderType,
} from '@prisma/client';
import { CouponService } from '../coupon/coupon.service';
import { ExperienceRepository } from '../experience/experience.repository';
import { ExperienceScheduleRepository } from '../experience-schedule/experience-schedule.repository';
import { PaymentService } from '../payment/payment.service';
import { OrganizationMemberService } from '../provider/organization-member.service';
import {
  buildPaginated,
  resolvePagination,
} from '../../shared/utils/pagination';
import { groupBookingsByCustomer } from '../../shared/utils/group-bookings-by-customer';
import { CheckExperienceAvailabilityDto } from './dto/check-experience-availability.dto';
import { CreateExperienceBookingDto } from './dto/create-experience-booking.dto';
import { ListAllExperienceBookingsDto } from './dto/list-all-experience-bookings.dto';
import { ListProviderExperienceBookingsDto } from './dto/list-provider-experience-bookings.dto';
import { ExperienceBookingRepository } from './experience-booking.repository';

@Injectable()
export class ExperienceBookingService {
  constructor(
    private readonly experienceBookingRepository: ExperienceBookingRepository,
    private readonly experienceRepository: ExperienceRepository,
    private readonly experienceScheduleRepository: ExperienceScheduleRepository,
    private readonly organizationMemberService: OrganizationMemberService,
    private readonly paymentService: PaymentService,
    private readonly couponService: CouponService,
  ) {}

  /** Public — xem còn chỗ không + báo giá trước khi nhập Customer Info. */
  async checkAvailability(dto: CheckExperienceAvailabilityDto) {
    const experienceId = BigInt(dto.experienceId);
    const experience = await this.getBookableExperience(experienceId);
    const departureDate = this.parseDate(dto.departureDate);

    const schedule =
      await this.experienceScheduleRepository.findByExperienceAndDate(
        experienceId,
        departureDate,
      );
    const available = !!schedule && schedule.available > 0;

    return {
      available,
      availableSeats: schedule?.available ?? 0,
      pricePerPerson: available
        ? (schedule.price ?? experience.price).toString()
        : null,
      currency: experience.currency,
    };
  }

  async create(userId: bigint, dto: CreateExperienceBookingDto) {
    const experienceId = BigInt(dto.experienceId);
    const experience = await this.getBookableExperience(experienceId);
    const departureDate = this.parseDate(dto.departureDate);

    if (
      experience.maxParticipants &&
      dto.numberOfPeople > experience.maxParticipants
    ) {
      throw new BadRequestException(
        `This experience fits at most ${experience.maxParticipants} people`,
      );
    }

    await this.couponService.validateCode(
      userId,
      BookingDomain.EXPERIENCE,
      dto.couponCode,
    );

    const result = await this.experienceBookingRepository.createBooking({
      userId,
      experienceId,
      experienceTitle: experience.title,
      basePrice: experience.price,
      currency: experience.currency,
      departureDate,
      numberOfPeople: dto.numberOfPeople,
      customerName: dto.customerName,
      customerEmail: dto.customerEmail,
      customerPhone: dto.customerPhone,
    });

    if (!result.ok) {
      if (result.reason === 'MISSING_SCHEDULE') {
        throw new BadRequestException(
          'This experience has no schedule for this date yet',
        );
      }
      throw new ConflictException('Not enough seats available for this date');
    }

    const { discountAmount } = await this.couponService.applyDiscount({
      userId,
      bookingDomain: BookingDomain.EXPERIENCE,
      bookingId: result.booking.id,
      subtotal: result.booking.totalPrice,
      couponCode: dto.couponCode,
    });

    const { checkoutUrl } = await this.paymentService.createForBooking({
      userId,
      bookingDomain: BookingDomain.EXPERIENCE,
      bookingId: result.booking.id,
      amount: result.booking.totalPrice.sub(discountAmount),
      discountAmount,
      currency: result.booking.currency,
      description: `Experience: ${experience.title} (${dto.departureDate})`,
    });

    return { booking: result.booking, checkoutUrl };
  }

  /** Admin — xem toan bo ExperienceBooking, filter theo status (CONFIRMED/CANCELLED). */
  async listAll(query: ListAllExperienceBookingsDto) {
    const { page, limit, skip, take } = resolvePagination(query);
    const where: Prisma.ExperienceBookingWhereInput = {
      ...(query.status && { status: query.status }),
    };

    const [items, totalItems] = await this.experienceBookingRepository.findAll(
      where,
      skip,
      take,
    );
    return buildPaginated(items, totalItems, page, limit);
  }

  /** My Experience Bookings — status? = upcoming | completed | cancelled (bỏ trống là tất cả). */
  listMine(userId: bigint, status?: 'upcoming' | 'completed' | 'cancelled') {
    const today = this.today();
    return this.experienceBookingRepository.findManyByUser(
      userId,
      status,
      today,
    );
  }

  /** Experience Operator — xem ExperienceBooking cua cac Experience minh so huu, optional loc theo 1 Experience. */
  async listMineAsProvider(
    userId: bigint,
    query: ListProviderExperienceBookingsDto,
  ) {
    const { provider } = await this.organizationMemberService.requireMembership(
      userId,
      { providerType: ProviderType.ACTIVITY, permission: 'booking:view' },
    );

    const today = this.today();
    return this.experienceBookingRepository.findManyByProvider(
      provider.id,
      query.experienceId ? BigInt(query.experienceId) : undefined,
      query.status,
      today,
    );
  }

  /** V7 vong 7 — Provider xem danh sach khach hang, nhom tu toan bo ExperienceBooking cua minh. */
  async listCustomersAsProvider(userId: bigint) {
    const { provider } = await this.organizationMemberService.requireMembership(
      userId,
      { providerType: ProviderType.ACTIVITY, permission: 'booking:view' },
    );

    const today = this.today();
    const bookings = await this.experienceBookingRepository.findManyByProvider(
      provider.id,
      undefined,
      undefined,
      today,
    );
    return groupBookingsByCustomer(bookings);
  }

  /** Chi huy duoc booking CONFIRMED cua chinh minh va departureDate chua toi. */
  async cancel(userId: bigint, bookingId: bigint) {
    const booking = await this.experienceBookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundException('Experience booking not found');
    }
    if (booking.userId !== userId) {
      throw new ForbiddenException('You do not own this booking');
    }
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('This booking is already cancelled');
    }

    const today = this.today();
    if (booking.departureDate <= today) {
      throw new BadRequestException(
        'Cannot cancel a booking that has already taken place',
      );
    }

    const result = await this.experienceBookingRepository.cancelBooking(
      bookingId,
      booking.experienceId,
      booking.departureDate,
      booking.numberOfPeople,
    );
    if (!result.ok) {
      throw new BadRequestException('This booking is already cancelled');
    }

    const refundResult = await this.paymentService.createRefundForBooking({
      userId,
      bookingDomain: BookingDomain.EXPERIENCE,
      bookingId,
      startDate: booking.departureDate,
    });
    if (refundResult.refundPending) {
      result.booking.status = BookingStatus.REFUND_PENDING;
    }

    return result.booking;
  }

  /** Experience phải APPROVED — cùng luật public như Experience/Experience Schedule. */
  private async getBookableExperience(experienceId: bigint) {
    const experience = await this.experienceRepository.findById(experienceId);
    if (!experience || experience.status !== ExperienceStatus.APPROVED) {
      throw new NotFoundException('Experience not found');
    }
    return experience;
  }

  private parseDate(raw: string): Date {
    return new Date(`${raw}T00:00:00.000Z`);
  }

  private today(): Date {
    return new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
  }
}
