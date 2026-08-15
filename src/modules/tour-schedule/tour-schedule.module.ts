import { Module } from '@nestjs/common';
import { ProviderModule } from '../provider/provider.module';
import { TourModule } from '../tour/tour.module';
import { TourScheduleController } from './tour-schedule.controller';
import { TourScheduleRepository } from './tour-schedule.repository';
import { TourScheduleService } from './tour-schedule.service';

@Module({
  imports: [TourModule, ProviderModule],
  controllers: [TourScheduleController],
  providers: [TourScheduleService, TourScheduleRepository],
  exports: [TourScheduleRepository],
})
export class TourScheduleModule {}
