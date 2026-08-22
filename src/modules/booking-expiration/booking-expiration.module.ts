import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { BookingModule } from '../booking/booking.module';
import { CouponModule } from '../coupon/coupon.module';
import { ExperienceBookingModule } from '../experience-booking/experience-booking.module';
import { FlightBookingModule } from '../flight-booking/flight-booking.module';
import { PaymentModule } from '../payment/payment.module';
import { TourBookingModule } from '../tour-booking/tour-booking.module';
import { TransportBookingModule } from '../transport-booking/transport-booking.module';
import { BookingExpirationProcessor } from './booking-expiration.processor';
import { BookingExpirationService } from './booking-expiration.service';

@Module({
  imports: [
    BookingModule,
    TourBookingModule,
    ExperienceBookingModule,
    TransportBookingModule,
    FlightBookingModule,
    PaymentModule,
    CouponModule,
    BullModule.registerQueue({ name: 'booking-expiration' }),
  ],
  providers: [BookingExpirationService, BookingExpirationProcessor],
})
export class BookingExpirationModule {}
