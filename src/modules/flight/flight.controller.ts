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
import { CreateFlightDto } from './dto/create-flight.dto';
import { ListFlightsDto } from './dto/list-flights.dto';
import { ReviewFlightDto } from './dto/review-flight.dto';
import { UpdateFlightDto } from './dto/update-flight.dto';
import { FlightService } from './flight.service';

@ApiTags('Flight')
@Controller('flights')
export class FlightController {
  constructor(private readonly flightService: FlightService) {}

  @Get()
  list(@Query() query: ListFlightsDto) {
    return this.flightService.list(query);
  }

  @Get('mine')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  listMine(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: ListFlightsDto,
  ) {
    return this.flightService.listMine(BigInt(user.id), query);
  }

  @Get('moderation')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  listForModeration(@Query() query: ListFlightsDto) {
    return this.flightService.listForModeration(query);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.flightService.getById(parseIdParam(id));
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateFlightDto,
  ) {
    return this.flightService.create(BigInt(user.id), dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateFlightDto,
  ) {
    return this.flightService.update(BigInt(user.id), parseIdParam(id), dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.flightService.remove(BigInt(user.id), parseIdParam(id));
  }

  @Patch(':id/review')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  review(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: ReviewFlightDto,
  ) {
    return this.flightService.review(
      BigInt(user.id),
      user.role,
      parseIdParam(id),
      dto.status,
      dto.reason,
    );
  }
}
