import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { parseIdParam } from '../../shared/utils/parse-id';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateFlightBookingDto } from './dto/create-flight-booking.dto';
import { ListAllFlightBookingsDto } from './dto/list-all-flight-bookings.dto';
import { ListMyFlightBookingsDto } from './dto/list-my-flight-bookings.dto';
import { ListProviderFlightBookingsDto } from './dto/list-provider-flight-bookings.dto';
import { FlightBookingService } from './flight-booking.service';

@ApiTags('Flight Booking')
@Controller('flight-bookings')
export class FlightBookingController {
  constructor(private readonly flightBookingService: FlightBookingService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  listAll(@Query() query: ListAllFlightBookingsDto) {
    return this.flightBookingService.listAll(query);
  }

  @Get('mine')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  listMine(@CurrentUser() user: CurrentUserPayload, @Query() query: ListMyFlightBookingsDto) {
    return this.flightBookingService.listMine(BigInt(user.id), query.status);
  }

  @Get('provider')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  listMineAsProvider(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: ListProviderFlightBookingsDto,
  ) {
    return this.flightBookingService.listMineAsProvider(BigInt(user.id), query);
  }

  @Get('provider/customers')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  listCustomersAsProvider(@CurrentUser() user: CurrentUserPayload) {
    return this.flightBookingService.listCustomersAsProvider(BigInt(user.id));
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateFlightBookingDto) {
    return this.flightBookingService.create(BigInt(user.id), dto);
  }

  @Patch(':id/cancel')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  cancel(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.flightBookingService.cancel(BigInt(user.id), parseIdParam(id));
  }
}
