import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { parseIdParam } from '../../shared/utils/parse-id';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CheckTourAvailabilityDto } from './dto/check-tour-availability.dto';
import { CreateTourBookingDto } from './dto/create-tour-booking.dto';
import { ListAllTourBookingsDto } from './dto/list-all-tour-bookings.dto';
import { ListMyTourBookingsDto } from './dto/list-my-tour-bookings.dto';
import { ListProviderTourBookingsDto } from './dto/list-provider-tour-bookings.dto';
import { TourBookingService } from './tour-booking.service';

@ApiTags('Tour Booking')
@Controller('tour-bookings')
export class TourBookingController {
  constructor(private readonly tourBookingService: TourBookingService) {}

  @Get('availability')
  checkAvailability(@Query() query: CheckTourAvailabilityDto) {
    return this.tourBookingService.checkAvailability(query);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  listAll(@Query() query: ListAllTourBookingsDto) {
    return this.tourBookingService.listAll(query);
  }

  @Get('mine')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  listMine(@CurrentUser() user: CurrentUserPayload, @Query() query: ListMyTourBookingsDto) {
    return this.tourBookingService.listMine(BigInt(user.id), query.status);
  }

  @Get('provider')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  listMineAsProvider(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: ListProviderTourBookingsDto,
  ) {
    return this.tourBookingService.listMineAsProvider(BigInt(user.id), query);
  }

  @Get('provider/customers')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  listCustomersAsProvider(@CurrentUser() user: CurrentUserPayload) {
    return this.tourBookingService.listCustomersAsProvider(BigInt(user.id));
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateTourBookingDto) {
    return this.tourBookingService.create(BigInt(user.id), dto);
  }

  @Patch(':id/cancel')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  cancel(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.tourBookingService.cancel(BigInt(user.id), parseIdParam(id));
  }
}
