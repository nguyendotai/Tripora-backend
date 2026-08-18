import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { parseIdParam } from '../../shared/utils/parse-id';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CheckTransportAvailabilityDto } from './dto/check-transport-availability.dto';
import { CreateTransportBookingDto } from './dto/create-transport-booking.dto';
import { ListAllTransportBookingsDto } from './dto/list-all-transport-bookings.dto';
import { ListMyTransportBookingsDto } from './dto/list-my-transport-bookings.dto';
import { ListProviderTransportBookingsDto } from './dto/list-provider-transport-bookings.dto';
import { TransportBookingService } from './transport-booking.service';

@ApiTags('Transport Booking')
@Controller('transport-bookings')
export class TransportBookingController {
  constructor(private readonly transportBookingService: TransportBookingService) {}

  @Get('availability')
  checkAvailability(@Query() query: CheckTransportAvailabilityDto) {
    return this.transportBookingService.checkAvailability(query);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  listAll(@Query() query: ListAllTransportBookingsDto) {
    return this.transportBookingService.listAll(query);
  }

  @Get('mine')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  listMine(@CurrentUser() user: CurrentUserPayload, @Query() query: ListMyTransportBookingsDto) {
    return this.transportBookingService.listMine(BigInt(user.id), query.status);
  }

  @Get('provider')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  listMineAsProvider(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: ListProviderTransportBookingsDto,
  ) {
    return this.transportBookingService.listMineAsProvider(BigInt(user.id), query);
  }

  @Get('provider/customers')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  listCustomersAsProvider(@CurrentUser() user: CurrentUserPayload) {
    return this.transportBookingService.listCustomersAsProvider(
      BigInt(user.id),
    );
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateTransportBookingDto) {
    return this.transportBookingService.create(BigInt(user.id), dto);
  }

  @Patch(':id/cancel')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  cancel(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.transportBookingService.cancel(BigInt(user.id), parseIdParam(id));
  }
}
