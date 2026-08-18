import {
  Body,
  Controller,
  Get,
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
import { CheckExperienceAvailabilityDto } from './dto/check-experience-availability.dto';
import { CreateExperienceBookingDto } from './dto/create-experience-booking.dto';
import { ListAllExperienceBookingsDto } from './dto/list-all-experience-bookings.dto';
import { ListMyExperienceBookingsDto } from './dto/list-my-experience-bookings.dto';
import { ListProviderExperienceBookingsDto } from './dto/list-provider-experience-bookings.dto';
import { ExperienceBookingService } from './experience-booking.service';

@ApiTags('Experience Booking')
@Controller('experience-bookings')
export class ExperienceBookingController {
  constructor(
    private readonly experienceBookingService: ExperienceBookingService,
  ) {}

  @Get('availability')
  checkAvailability(@Query() query: CheckExperienceAvailabilityDto) {
    return this.experienceBookingService.checkAvailability(query);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  listAll(@Query() query: ListAllExperienceBookingsDto) {
    return this.experienceBookingService.listAll(query);
  }

  @Get('mine')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  listMine(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: ListMyExperienceBookingsDto,
  ) {
    return this.experienceBookingService.listMine(
      BigInt(user.id),
      query.status,
    );
  }

  @Get('provider')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  listMineAsProvider(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: ListProviderExperienceBookingsDto,
  ) {
    return this.experienceBookingService.listMineAsProvider(
      BigInt(user.id),
      query,
    );
  }

  @Get('provider/customers')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  listCustomersAsProvider(@CurrentUser() user: CurrentUserPayload) {
    return this.experienceBookingService.listCustomersAsProvider(
      BigInt(user.id),
    );
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateExperienceBookingDto,
  ) {
    return this.experienceBookingService.create(BigInt(user.id), dto);
  }

  @Patch(':id/cancel')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  cancel(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.experienceBookingService.cancel(
      BigInt(user.id),
      parseIdParam(id),
    );
  }
}
