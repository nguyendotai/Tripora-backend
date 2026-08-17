import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AssignGuideDto } from './dto/assign-guide.dto';
import { CreateTourGuideDto } from './dto/create-tour-guide.dto';
import { UpdateMyGuideProfileDto } from './dto/update-my-guide-profile.dto';
import { UpdateTourGuideDto } from './dto/update-tour-guide.dto';
import { TourGuideService } from './tour-guide.service';

@ApiTags('Tour Guide')
@Controller('tour-guides')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class TourGuideController {
  constructor(private readonly tourGuideService: TourGuideService) {}

  // ---------- Tour Operator ----------

  @Post()
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateTourGuideDto,
  ) {
    return this.tourGuideService.create(BigInt(user.id), dto);
  }

  @Get('mine')
  listMine(@CurrentUser() user: CurrentUserPayload) {
    return this.tourGuideService.listMine(BigInt(user.id));
  }

  @Patch('assign')
  assign(@CurrentUser() user: CurrentUserPayload, @Body() dto: AssignGuideDto) {
    return this.tourGuideService.assign(BigInt(user.id), dto);
  }

  // ---------- Guide ----------
  // Cac route co ten (me, me/schedules...) phai khai bao TRUOC ':id'/':id' wildcard —
  // Nest khop route theo dung thu tu khai bao, ':id' se "nuot" luon '/me' neu dung truoc.

  @Get('me')
  getMe(@CurrentUser() user: CurrentUserPayload) {
    return this.tourGuideService.getMe(BigInt(user.id));
  }

  @Patch('me')
  updateMe(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateMyGuideProfileDto,
  ) {
    return this.tourGuideService.updateMe(BigInt(user.id), dto);
  }

  @Get('me/schedules')
  listMySchedules(@CurrentUser() user: CurrentUserPayload) {
    return this.tourGuideService.listMySchedules(BigInt(user.id));
  }

  @Get('me/schedules/:scheduleId/travelers')
  listTravelers(
    @CurrentUser() user: CurrentUserPayload,
    @Param('scheduleId') scheduleId: string,
  ) {
    return this.tourGuideService.listTravelers(
      BigInt(user.id),
      BigInt(scheduleId),
    );
  }

  // ---------- Tour Operator (wildcard :id — phai khai bao sau cung) ----------

  @Patch(':id')
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateTourGuideDto,
  ) {
    return this.tourGuideService.update(BigInt(user.id), BigInt(id), dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.tourGuideService.remove(BigInt(user.id), BigInt(id));
  }
}
