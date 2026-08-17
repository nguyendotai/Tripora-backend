import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ListFlightSchedulesDto } from './dto/list-flight-schedules.dto';
import { SetFlightScheduleDto } from './dto/set-flight-schedule.dto';
import { FlightScheduleService } from './flight-schedule.service';

@ApiTags('Flight Schedule')
@Controller('flight-schedules')
export class FlightScheduleController {
  constructor(private readonly flightScheduleService: FlightScheduleService) {}

  @Get()
  list(@Query() query: ListFlightSchedulesDto) {
    return this.flightScheduleService.list(query);
  }

  @Get('mine')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  listMine(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: ListFlightSchedulesDto,
  ) {
    return this.flightScheduleService.listMine(BigInt(user.id), query);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  set(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: SetFlightScheduleDto,
  ) {
    return this.flightScheduleService.set(BigInt(user.id), dto);
  }
}
