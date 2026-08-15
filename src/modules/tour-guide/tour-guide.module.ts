import { Module } from '@nestjs/common';
import { ProviderModule } from '../provider/provider.module';
import { TourBookingModule } from '../tour-booking/tour-booking.module';
import { TourScheduleModule } from '../tour-schedule/tour-schedule.module';
import { TourModule } from '../tour/tour.module';
import { UserModule } from '../user/user.module';
import { TourGuideController } from './tour-guide.controller';
import { TourGuideRepository } from './tour-guide.repository';
import { TourGuideService } from './tour-guide.service';

@Module({
  imports: [
    ProviderModule,
    UserModule,
    TourModule,
    TourScheduleModule,
    TourBookingModule,
  ],
  controllers: [TourGuideController],
  providers: [TourGuideService, TourGuideRepository],
  exports: [TourGuideRepository],
})
export class TourGuideModule {}
