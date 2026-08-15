import { Module } from '@nestjs/common';
import { DestinationModule } from '../destination/destination.module';
import { NotificationModule } from '../notification/notification.module';
import { ProviderModule } from '../provider/provider.module';
import { TourController } from './tour.controller';
import { TourRepository } from './tour.repository';
import { TourService } from './tour.service';

@Module({
  imports: [DestinationModule, NotificationModule, ProviderModule],
  controllers: [TourController],
  providers: [TourService, TourRepository],
  exports: [TourRepository],
})
export class TourModule {}
