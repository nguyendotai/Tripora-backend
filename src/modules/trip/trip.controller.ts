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
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { parseIdParam } from '../../shared/utils/parse-id';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTripDayDto } from './dto/create-trip-day.dto';
import { CreateTripItemDto } from './dto/create-trip-item.dto';
import { CreateTripDto } from './dto/create-trip.dto';
import { ReorderTripItemsDto } from './dto/reorder-trip-items.dto';
import { UpdateTripItemDto } from './dto/update-trip-item.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { TripService } from './trip.service';

@ApiTags('Trip')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('trips')
export class TripController {
  constructor(private readonly tripService: TripService) {}

  @Get()
  list(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: { page?: number; limit?: number },
  ) {
    return this.tripService.list(BigInt(user.id), query);
  }

  @Get(':id')
  getDetail(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.tripService.getDetail(BigInt(user.id), parseIdParam(id));
  }

  @Post()
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateTripDto) {
    return this.tripService.create(BigInt(user.id), dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateTripDto,
  ) {
    return this.tripService.update(BigInt(user.id), parseIdParam(id), dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.tripService.remove(BigInt(user.id), parseIdParam(id));
  }

  @Post(':tripId/days')
  addDay(
    @CurrentUser() user: CurrentUserPayload,
    @Param('tripId') tripId: string,
    @Body() dto: CreateTripDayDto,
  ) {
    return this.tripService.addDay(BigInt(user.id), parseIdParam(tripId), dto);
  }

  @Delete(':tripId/days/:dayId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeDay(
    @CurrentUser() user: CurrentUserPayload,
    @Param('tripId') tripId: string,
    @Param('dayId') dayId: string,
  ) {
    return this.tripService.removeDay(
      BigInt(user.id),
      parseIdParam(tripId),
      parseIdParam(dayId),
    );
  }

  @Post(':tripId/days/:dayId/items')
  addItem(
    @CurrentUser() user: CurrentUserPayload,
    @Param('tripId') tripId: string,
    @Param('dayId') dayId: string,
    @Body() dto: CreateTripItemDto,
  ) {
    return this.tripService.addItem(
      BigInt(user.id),
      parseIdParam(tripId),
      parseIdParam(dayId),
      dto,
    );
  }

  @Patch(':tripId/days/:dayId/items/reorder')
  reorderItems(
    @CurrentUser() user: CurrentUserPayload,
    @Param('tripId') tripId: string,
    @Param('dayId') dayId: string,
    @Body() dto: ReorderTripItemsDto,
  ) {
    return this.tripService.reorderItems(
      BigInt(user.id),
      parseIdParam(tripId),
      parseIdParam(dayId),
      dto.itemIds,
    );
  }

  @Patch(':tripId/days/:dayId/items/:itemId')
  updateItem(
    @CurrentUser() user: CurrentUserPayload,
    @Param('tripId') tripId: string,
    @Param('dayId') dayId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateTripItemDto,
  ) {
    return this.tripService.updateItem(
      BigInt(user.id),
      parseIdParam(tripId),
      parseIdParam(dayId),
      parseIdParam(itemId),
      dto,
    );
  }

  @Delete(':tripId/days/:dayId/items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeItem(
    @CurrentUser() user: CurrentUserPayload,
    @Param('tripId') tripId: string,
    @Param('dayId') dayId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.tripService.removeItem(
      BigInt(user.id),
      parseIdParam(tripId),
      parseIdParam(dayId),
      parseIdParam(itemId),
    );
  }
}
