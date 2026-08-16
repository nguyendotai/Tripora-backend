import { Module } from '@nestjs/common';
import { AircraftModule } from '../aircraft/aircraft.module';
import { AirportModule } from '../airport/airport.module';
import { NotificationModule } from '../notification/notification.module';
import { ProviderModule } from '../provider/provider.module';
import { FlightController } from './flight.controller';
import { FlightRepository } from './flight.repository';
import { FlightService } from './flight.service';

@Module({
  imports: [NotificationModule, ProviderModule, AircraftModule, AirportModule],
  controllers: [FlightController],
  providers: [FlightService, FlightRepository],
  exports: [FlightRepository],
})
export class FlightModule {}
