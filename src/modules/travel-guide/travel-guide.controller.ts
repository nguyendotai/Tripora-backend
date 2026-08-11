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
import { CreateTravelGuideDto } from './dto/create-travel-guide.dto';
import { ListTravelGuidesDto } from './dto/list-travel-guides.dto';
import { UpdateTravelGuideDto } from './dto/update-travel-guide.dto';
import { TravelGuideService } from './travel-guide.service';

@ApiTags('Travel Guide')
@Controller('travel-guides')
export class TravelGuideController {
  constructor(private readonly travelGuideService: TravelGuideService) {}

  @Get()
  list(@Query() query: ListTravelGuidesDto) {
    return this.travelGuideService.list(query);
  }

  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.travelGuideService.getBySlug(slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateTravelGuideDto) {
    return this.travelGuideService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateTravelGuideDto) {
    return this.travelGuideService.update(parseIdParam(id), dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.travelGuideService.remove(parseIdParam(id));
  }
}
