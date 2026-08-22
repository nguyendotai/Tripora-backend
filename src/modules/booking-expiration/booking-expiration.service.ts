import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BookingDomain } from '@prisma/client';
import { BookingRepository } from '../booking/booking.repository';
import { CouponRepository } from '../coupon/coupon.repository';
import { ExperienceBookingRepository } from '../experience-booking/experience-booking.repository';
import { FlightBookingRepository } from '../flight-booking/flight-booking.repository';
import { PaymentRepository } from '../payment/payment.repository';
import { TourBookingRepository } from '../tour-booking/tour-booking.repository';
import { TransportBookingRepository } from '../transport-booking/transport-booking.repository';

const DEFAULT_EXPIRY_MINUTES = 30;

/**
 * Module rieng (khong nam trong PaymentModule) vi can import ca 5 module Booking de goi dung
 * expirePending() cua tung domain (mirror y het cancelBooking cua chinh domain do, thay vi tu
 * suy dien logic hoan ton kho o day) — neu de trong PaymentModule se tao circular dependency
 * vi ca 5 module Booking cung can import nguoc PaymentModule (goi createForBooking). Module nay
 * la "leaf" tren cung, chi tieu thu, khong module nao import nguoc lai.
 */
@Injectable()
export class BookingExpirationService {
  private readonly logger = new Logger(BookingExpirationService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly paymentRepository: PaymentRepository,
    private readonly couponRepository: CouponRepository,
    private readonly hotelBookingRepository: BookingRepository,
    private readonly tourBookingRepository: TourBookingRepository,
    private readonly experienceBookingRepository: ExperienceBookingRepository,
    private readonly transportBookingRepository: TransportBookingRepository,
    private readonly flightBookingRepository: FlightBookingRepository,
  ) {}

  /** V9 vong 5 — trigger boi BookingExpirationProcessor (BullMQ repeatable job moi 5 phut) thay
   * vi @Cron truoc day — than ham giu nguyen 100%, chi doi co che goi. */
  async expirePendingBookings(): Promise<void> {
    const minutes =
      this.config.get<number>('BOOKING_PAYMENT_EXPIRY_MINUTES') ??
      DEFAULT_EXPIRY_MINUTES;
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);

    const [hotelIds, tourIds, experienceIds, transportIds, flightIds] =
      await Promise.all([
        this.hotelBookingRepository.expirePending(cutoff),
        this.tourBookingRepository.expirePending(cutoff),
        this.experienceBookingRepository.expirePending(cutoff),
        this.transportBookingRepository.expirePending(cutoff),
        this.flightBookingRepository.expirePending(cutoff),
      ]);

    await Promise.all([
      this.paymentRepository.markFailedForExpiredBookings(
        BookingDomain.HOTEL,
        hotelIds,
      ),
      this.paymentRepository.markFailedForExpiredBookings(
        BookingDomain.TOUR,
        tourIds,
      ),
      this.paymentRepository.markFailedForExpiredBookings(
        BookingDomain.EXPERIENCE,
        experienceIds,
      ),
      this.paymentRepository.markFailedForExpiredBookings(
        BookingDomain.TRANSPORT,
        transportIds,
      ),
      this.paymentRepository.markFailedForExpiredBookings(
        BookingDomain.FLIGHT,
        flightIds,
      ),
      this.couponRepository.rollbackForExpiredBookings(
        BookingDomain.HOTEL,
        hotelIds,
      ),
      this.couponRepository.rollbackForExpiredBookings(
        BookingDomain.TOUR,
        tourIds,
      ),
      this.couponRepository.rollbackForExpiredBookings(
        BookingDomain.EXPERIENCE,
        experienceIds,
      ),
      this.couponRepository.rollbackForExpiredBookings(
        BookingDomain.TRANSPORT,
        transportIds,
      ),
      this.couponRepository.rollbackForExpiredBookings(
        BookingDomain.FLIGHT,
        flightIds,
      ),
    ]);

    const total =
      hotelIds.length +
      tourIds.length +
      experienceIds.length +
      transportIds.length +
      flightIds.length;
    if (total > 0) {
      this.logger.log(
        `Expired ${total} PENDING_PAYMENT booking(s): hotel=${hotelIds.length} tour=${tourIds.length} ` +
          `experience=${experienceIds.length} transport=${transportIds.length} flight=${flightIds.length}`,
      );
    }
  }
}
