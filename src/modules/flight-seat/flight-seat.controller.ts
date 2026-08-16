import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ListFlightSeatsDto } from './dto/list-flight-seats.dto';
import { FlightSeatService } from './flight-seat.service';

@ApiTags('Flight Seat')
@Controller('flight-seats')
export class FlightSeatController {
  constructor(private readonly flightSeatService: FlightSeatService) {}

  @Get()
  list(@Query() query: ListFlightSeatsDto) {
    return this.flightSeatService.list(BigInt(query.scheduleId));
  }
}
