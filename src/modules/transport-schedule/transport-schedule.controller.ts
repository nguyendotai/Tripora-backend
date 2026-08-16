import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ListTransportSchedulesDto } from './dto/list-transport-schedules.dto';
import { SetTransportScheduleDto } from './dto/set-transport-schedule.dto';
import { TransportScheduleService } from './transport-schedule.service';

@ApiTags('Transport Schedule')
@Controller('transport-schedules')
export class TransportScheduleController {
  constructor(
    private readonly transportScheduleService: TransportScheduleService,
  ) {}

  @Get()
  list(@Query() query: ListTransportSchedulesDto) {
    return this.transportScheduleService.list(query);
  }

  @Get('mine')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  listMine(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: ListTransportSchedulesDto,
  ) {
    return this.transportScheduleService.listMine(BigInt(user.id), query);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  set(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: SetTransportScheduleDto,
  ) {
    return this.transportScheduleService.set(BigInt(user.id), dto);
  }
}
