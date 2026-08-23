import { Module } from '@nestjs/common';
import { ExperienceScheduleModule } from '../experience-schedule/experience-schedule.module';
import { FlightSeatModule } from '../flight-seat/flight-seat.module';
import { ProviderModule } from '../provider/provider.module';
import { RoomInventoryModule } from '../room-inventory/room-inventory.module';
import { TourScheduleModule } from '../tour-schedule/tour-schedule.module';
import { TransportScheduleModule } from '../transport-schedule/transport-schedule.module';
import { OccupancyController } from './occupancy.controller';
import { OccupancyService } from './occupancy.service';

@Module({
  imports: [
    ProviderModule,
    RoomInventoryModule,
    TourScheduleModule,
    ExperienceScheduleModule,
    TransportScheduleModule,
    FlightSeatModule,
  ],
  controllers: [OccupancyController],
  providers: [OccupancyService],
})
export class OccupancyModule {}
