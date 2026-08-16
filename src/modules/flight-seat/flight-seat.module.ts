import { Module } from '@nestjs/common';
import { FlightSeatController } from './flight-seat.controller';
import { FlightSeatRepository } from './flight-seat.repository';
import { FlightSeatService } from './flight-seat.service';

@Module({
  controllers: [FlightSeatController],
  providers: [FlightSeatService, FlightSeatRepository],
  exports: [FlightSeatRepository],
})
export class FlightSeatModule {}
