import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard, AuthenticatedUser } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { parseIdParam } from '../../shared/utils/parse-id';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ListBookingsDto } from './dto/list-bookings.dto';

@ApiTags('bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Roles(UserRole.TRAVELER)
  @Post()
  create(@Body() dto: CreateBookingDto, @CurrentUser() user: AuthenticatedUser) {
    return this.bookingService.create(dto, user);
  }

  @Roles(UserRole.TRAVELER)
  @Get('mine')
  findMine(@Query() query: ListBookingsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.bookingService.findMine(user, query);
  }

  @Roles(UserRole.PARTNER)
  @Get('partner')
  findForPartner(@Query() query: ListBookingsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.bookingService.findForPartner(user, query);
  }

  @Roles(UserRole.TRAVELER, UserRole.PARTNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.bookingService.findOne(parseIdParam(id), user);
  }

  @Roles(UserRole.TRAVELER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.bookingService.cancel(parseIdParam(id), user);
  }
}
