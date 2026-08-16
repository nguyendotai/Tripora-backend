import { Module } from '@nestjs/common';
import { AircraftModule } from '../aircraft/aircraft.module';
import { FlightModule } from '../flight/flight.module';
import { FlightSeatModule } from '../flight-seat/flight-seat.module';
import { ProviderModule } from '../provider/provider.module';
import { FlightScheduleController } from './flight-schedule.controller';
import { FlightScheduleRepository } from './flight-schedule.repository';
import { FlightScheduleService } from './flight-schedule.service';

@Module({
  imports: [FlightModule, AircraftModule, FlightSeatModule, ProviderModule],
  controllers: [FlightScheduleController],
  providers: [FlightScheduleService, FlightScheduleRepository],
  exports: [FlightScheduleRepository],
})
export class FlightScheduleModule {}
