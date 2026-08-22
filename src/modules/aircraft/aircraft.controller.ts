import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { parseIdParam } from '../../shared/utils/parse-id';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AircraftService } from './aircraft.service';
import { CreateAircraftDto } from './dto/create-aircraft.dto';
import { ListAircraftDto } from './dto/list-aircraft.dto';
import { ReviewAircraftDto } from './dto/review-aircraft.dto';
import { UpdateAircraftDto } from './dto/update-aircraft.dto';

@ApiTags('Aircraft')
@Controller('aircrafts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class AircraftController {
  constructor(private readonly aircraftService: AircraftService) {}

  @Get('mine')
  listMine(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: ListAircraftDto,
  ) {
    return this.aircraftService.listMine(BigInt(user.id), query);
  }

  @Get('moderation')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  listForModeration(@Query() query: ListAircraftDto) {
    return this.aircraftService.listForModeration(query);
  }

  @Post()
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateAircraftDto,
  ) {
    return this.aircraftService.create(BigInt(user.id), dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateAircraftDto,
  ) {
    return this.aircraftService.update(BigInt(user.id), parseIdParam(id), dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.aircraftService.remove(BigInt(user.id), parseIdParam(id));
  }

  @Patch(':id/review')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  review(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: ReviewAircraftDto,
  ) {
    return this.aircraftService.review(
      BigInt(user.id),
      user.role,
      parseIdParam(id),
      dto.status,
      dto.reason,
    );
  }
}
