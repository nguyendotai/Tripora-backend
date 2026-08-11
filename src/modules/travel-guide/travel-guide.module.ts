import { Module } from '@nestjs/common';
import { DestinationModule } from '../destination/destination.module';
import { TravelGuideController } from './travel-guide.controller';
import { TravelGuideRepository } from './travel-guide.repository';
import { TravelGuideService } from './travel-guide.service';

@Module({
  imports: [DestinationModule],
  controllers: [TravelGuideController],
  providers: [TravelGuideService, TravelGuideRepository],
})
export class TravelGuideModule {}
