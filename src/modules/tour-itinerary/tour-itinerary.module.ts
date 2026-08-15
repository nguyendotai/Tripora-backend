import { Module } from '@nestjs/common';
import { ProviderModule } from '../provider/provider.module';
import { TourModule } from '../tour/tour.module';
import { TourItineraryController } from './tour-itinerary.controller';
import { TourItineraryRepository } from './tour-itinerary.repository';
import { TourItineraryService } from './tour-itinerary.service';

@Module({
  imports: [TourModule, ProviderModule],
  controllers: [TourItineraryController],
  providers: [TourItineraryService, TourItineraryRepository],
  exports: [TourItineraryRepository],
})
export class TourItineraryModule {}
