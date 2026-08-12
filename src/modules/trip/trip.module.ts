import { Module } from '@nestjs/common';
import { DestinationModule } from '../destination/destination.module';
import { TripController } from './trip.controller';
import { TripRepository } from './trip.repository';
import { TripService } from './trip.service';

@Module({
  imports: [DestinationModule],
  controllers: [TripController],
  providers: [TripService, TripRepository],
})
export class TripModule {}
