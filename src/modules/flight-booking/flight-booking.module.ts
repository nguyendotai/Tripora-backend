import { Module } from '@nestjs/common';
import { AirportModule } from '../airport/airport.module';
import { CouponModule } from '../coupon/coupon.module';
import { FlightSeatModule } from '../flight-seat/flight-seat.module';
import { PaymentModule } from '../payment/payment.module';
import { ProviderModule } from '../provider/provider.module';
import { FlightBookingController } from './flight-booking.controller';
import { FlightBookingRepository } from './flight-booking.repository';
import { FlightBookingService } from './flight-booking.service';

@Module({
  imports: [
    FlightSeatModule,
    AirportModule,
    ProviderModule,
    PaymentModule,
    CouponModule,
  ],
  controllers: [FlightBookingController],
  providers: [FlightBookingService, FlightBookingRepository],
  exports: [FlightBookingRepository],
})
export class FlightBookingModule {}
