import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ListExperienceSchedulesDto } from './dto/list-experience-schedules.dto';
import { SetExperienceScheduleDto } from './dto/set-experience-schedule.dto';
import { ExperienceScheduleService } from './experience-schedule.service';

@ApiTags('Experience Schedule')
@Controller('experience-schedules')
export class ExperienceScheduleController {
  constructor(
    private readonly experienceScheduleService: ExperienceScheduleService,
  ) {}

  @Get()
  list(@Query() query: ListExperienceSchedulesDto) {
    return this.experienceScheduleService.list(query);
  }

  @Get('mine')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  listMine(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: ListExperienceSchedulesDto,
  ) {
    return this.experienceScheduleService.listMine(BigInt(user.id), query);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  set(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: SetExperienceScheduleDto,
  ) {
    return this.experienceScheduleService.set(BigInt(user.id), dto);
  }
}
