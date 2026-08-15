import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ListTourSchedulesDto } from './dto/list-tour-schedules.dto';
import { SetTourScheduleDto } from './dto/set-tour-schedule.dto';
import { TourScheduleService } from './tour-schedule.service';

@ApiTags('Tour Schedule')
@Controller('tour-schedules')
export class TourScheduleController {
  constructor(private readonly tourScheduleService: TourScheduleService) {}

  @Get()
  list(@Query() query: ListTourSchedulesDto) {
    return this.tourScheduleService.list(query);
  }

  @Get('mine')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  listMine(@CurrentUser() user: CurrentUserPayload, @Query() query: ListTourSchedulesDto) {
    return this.tourScheduleService.listMine(BigInt(user.id), query);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  set(@CurrentUser() user: CurrentUserPayload, @Body() dto: SetTourScheduleDto) {
    return this.tourScheduleService.set(BigInt(user.id), dto);
  }
}
