import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { parseIdParam } from '../../shared/utils/parse-id';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BookingService } from './booking.service';
import { CheckAvailabilityDto } from './dto/check-availability.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ListAllBookingsDto } from './dto/list-all-bookings.dto';
import { ListMyBookingsDto } from './dto/list-my-bookings.dto';
import { ListProviderBookingsDto } from './dto/list-provider-bookings.dto';

@ApiTags('Booking')
@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Get('availability')
  checkAvailability(@Query() query: CheckAvailabilityDto) {
    return this.bookingService.checkAvailability(query);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  listAll(@Query() query: ListAllBookingsDto) {
    return this.bookingService.listAll(query);
  }

  @Get('mine')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  listMine(@CurrentUser() user: CurrentUserPayload, @Query() query: ListMyBookingsDto) {
    return this.bookingService.listMine(BigInt(user.id), query.status);
  }

  @Get('provider')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  listMineAsProvider(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: ListProviderBookingsDto,
  ) {
    return this.bookingService.listMineAsProvider(BigInt(user.id), query);
  }

  @Get('provider/customers')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  listCustomersAsProvider(@CurrentUser() user: CurrentUserPayload) {
    return this.bookingService.listCustomersAsProvider(BigInt(user.id));
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateBookingDto) {
    return this.bookingService.create(BigInt(user.id), dto);
  }

  @Patch(':id/cancel')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  cancel(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.bookingService.cancel(BigInt(user.id), parseIdParam(id));
  }
}
