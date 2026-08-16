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
  Prisma,
  ProviderStatus,
  ProviderType,
  TourStatus,
} from '@prisma/client';
import { CouponService } from '../coupon/coupon.service';
import { PaymentService } from '../payment/payment.service';
import { ProviderRepository } from '../provider/provider.repository';
import { TourRepository } from '../tour/tour.repository';
import { TourScheduleRepository } from '../tour-schedule/tour-schedule.repository';
import {
  buildPaginated,
  resolvePagination,
} from '../../shared/utils/pagination';
import { CheckTourAvailabilityDto } from './dto/check-tour-availability.dto';
import { CreateTourBookingDto } from './dto/create-tour-booking.dto';
import { ListAllTourBookingsDto } from './dto/list-all-tour-bookings.dto';
import { ListProviderTourBookingsDto } from './dto/list-provider-tour-bookings.dto';
import { TourBookingRepository } from './tour-booking.repository';

@Injectable()
export class TourBookingService {
  constructor(
    private readonly tourBookingRepository: TourBookingRepository,
    private readonly tourRepository: TourRepository,
    private readonly tourScheduleRepository: TourScheduleRepository,
    private readonly providerRepository: ProviderRepository,
    private readonly paymentService: PaymentService,
    private readonly couponService: CouponService,
  ) {}

  /** Public — xem còn chỗ không + báo giá trước khi nhập Customer Info. */
  async checkAvailability(dto: CheckTourAvailabilityDto) {
    const tourId = BigInt(dto.tourId);
    const tour = await this.getBookableTour(tourId);
    const departureDate = this.parseDate(dto.departureDate);

    const schedule = await this.tourScheduleRepository.findByTourAndDate(
      tourId,
      departureDate,
    );
    const available = !!schedule && schedule.available > 0;

    return {
      available,
      availableSeats: schedule?.available ?? 0,
      pricePerPerson: available
        ? (schedule.price ?? tour.price).toString()
        : null,
      currency: tour.currency,
    };
  }

  async create(userId: bigint, dto: CreateTourBookingDto) {
    const tourId = BigInt(dto.tourId);
    const tour = await this.getBookableTour(tourId);
    const departureDate = this.parseDate(dto.departureDate);

    if (tour.maxParticipants && dto.numberOfPeople > tour.maxParticipants) {
      throw new BadRequestException(
        `This tour fits at most ${tour.maxParticipants} people`,
      );
    }

    await this.couponService.validateCode(
      userId,
      BookingDomain.TOUR,
      dto.couponCode,
    );

    const result = await this.tourBookingRepository.createBooking({
      userId,
      tourId,
      tourTitle: tour.title,
      basePrice: tour.price,
      currency: tour.currency,
      departureDate,
      numberOfPeople: dto.numberOfPeople,
      customerName: dto.customerName,
      customerEmail: dto.customerEmail,
      customerPhone: dto.customerPhone,
    });

    if (!result.ok) {
      if (result.reason === 'MISSING_SCHEDULE') {
        throw new BadRequestException(
          'This tour has no departure scheduled for this date yet',
        );
      }
      throw new ConflictException(
        'Not enough seats available for this departure date',
      );
    }

    const { discountAmount } = await this.couponService.applyDiscount({
      userId,
      bookingDomain: BookingDomain.TOUR,
      bookingId: result.booking.id,
      subtotal: result.booking.totalPrice,
      couponCode: dto.couponCode,
    });

    const { checkoutUrl } = await this.paymentService.createForBooking({
      userId,
      bookingDomain: BookingDomain.TOUR,
      bookingId: result.booking.id,
      amount: result.booking.totalPrice.sub(discountAmount),
      discountAmount,
      currency: result.booking.currency,
      description: `Tour: ${tour.title} (${dto.departureDate})`,
    });

    return { booking: result.booking, checkoutUrl };
  }

  /** Admin — xem toan bo TourBooking, filter theo status (CONFIRMED/CANCELLED). */
  async listAll(query: ListAllTourBookingsDto) {
    const { page, limit, skip, take } = resolvePagination(query);
    const where: Prisma.TourBookingWhereInput = {
      ...(query.status && { status: query.status }),
    };

    const [items, totalItems] = await this.tourBookingRepository.findAll(
      where,
      skip,
      take,
    );
    return buildPaginated(items, totalItems, page, limit);
  }

  /** My Tour Bookings — status? = upcoming | completed | cancelled (bỏ trống là tất cả). */
  listMine(userId: bigint, status?: 'upcoming' | 'completed' | 'cancelled') {
    const today = this.today();
    return this.tourBookingRepository.findManyByUser(userId, status, today);
  }

  /** Tour Operator — xem TourBooking cua cac Tour minh so huu, optional loc theo 1 Tour. */
  async listMineAsProvider(userId: bigint, query: ListProviderTourBookingsDto) {
    const provider = await this.providerRepository.findByUserId(userId);
    if (
      !provider ||
      provider.status !== ProviderStatus.APPROVED ||
      provider.type !== ProviderType.TOUR
    ) {
      throw new ForbiddenException(
        'You need an approved tour operator profile to do this',
      );
    }

    const today = this.today();
    return this.tourBookingRepository.findManyByProvider(
      provider.id,
      query.tourId ? BigInt(query.tourId) : undefined,
      query.status,
      today,
    );
  }

  /** Chi huy duoc booking CONFIRMED cua chinh minh va departureDate chua toi. */
  async cancel(userId: bigint, bookingId: bigint) {
    const booking = await this.tourBookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundException('Tour booking not found');
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
        'Cannot cancel a booking that has already departed',
      );
    }

    const result = await this.tourBookingRepository.cancelBooking(
      bookingId,
      booking.tourId,
      booking.departureDate,
      booking.numberOfPeople,
    );
    if (!result.ok) {
      throw new BadRequestException('This booking is already cancelled');
    }
    return result.booking;
  }

  /** Tour phải APPROVED — cùng luật public như Tour/Tour Schedule. */
  private async getBookableTour(tourId: bigint) {
    const tour = await this.tourRepository.findById(tourId);
    if (!tour || tour.status !== TourStatus.APPROVED) {
      throw new NotFoundException('Tour not found');
    }
    return tour;
  }

  private parseDate(raw: string): Date {
    return new Date(`${raw}T00:00:00.000Z`);
  }

  private today(): Date {
    return new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
  }
}
