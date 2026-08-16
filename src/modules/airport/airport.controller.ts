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
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { parseIdParam } from '../../shared/utils/parse-id';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AirportService } from './airport.service';
import { CreateAirportDto } from './dto/create-airport.dto';
import { ListAirportsDto } from './dto/list-airports.dto';
import { UpdateAirportDto } from './dto/update-airport.dto';

@ApiTags('Airport')
@Controller('airports')
export class AirportController {
  constructor(private readonly airportService: AirportService) {}

  @Get()
  list(@Query() query: ListAirportsDto) {
    return this.airportService.list(query);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.airportService.getById(parseIdParam(id));
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateAirportDto) {
    return this.airportService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateAirportDto) {
    return this.airportService.update(parseIdParam(id), dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.airportService.remove(parseIdParam(id));
  }
}
