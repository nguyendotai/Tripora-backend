import { Module } from '@nestjs/common';
import { PaymentModule } from '../payment/payment.module';
import { ProviderModule } from '../provider/provider.module';
import { TourModule } from '../tour/tour.module';
import { TourScheduleModule } from '../tour-schedule/tour-schedule.module';
import { TourBookingController } from './tour-booking.controller';
import { TourBookingRepository } from './tour-booking.repository';
import { TourBookingService } from './tour-booking.service';

@Module({
  imports: [TourModule, TourScheduleModule, ProviderModule, PaymentModule],
  controllers: [TourBookingController],
  providers: [TourBookingService, TourBookingRepository],
  exports: [TourBookingRepository],
})
export class TourBookingModule {}
