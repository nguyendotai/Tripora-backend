import { Module } from '@nestjs/common';
import { CouponModule } from '../coupon/coupon.module';
import { ExperienceModule } from '../experience/experience.module';
import { ExperienceScheduleModule } from '../experience-schedule/experience-schedule.module';
import { PaymentModule } from '../payment/payment.module';
import { ProviderModule } from '../provider/provider.module';
import { ExperienceBookingController } from './experience-booking.controller';
import { ExperienceBookingRepository } from './experience-booking.repository';
import { ExperienceBookingService } from './experience-booking.service';

@Module({
  imports: [
    ExperienceModule,
    ExperienceScheduleModule,
    ProviderModule,
    PaymentModule,
    CouponModule,
  ],
  controllers: [ExperienceBookingController],
  providers: [ExperienceBookingService, ExperienceBookingRepository],
  exports: [ExperienceBookingRepository],
})
export class ExperienceBookingModule {}
