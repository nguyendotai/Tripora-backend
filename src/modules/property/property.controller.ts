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
import { CreatePropertyDto } from './dto/create-property.dto';
import { ListPopularPropertiesDto } from './dto/list-popular-properties.dto';
import { ListPropertiesDto } from './dto/list-properties.dto';
import { ReviewPropertyDto } from './dto/review-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { PropertyService } from './property.service';

@ApiTags('Property')
@Controller('properties')
export class PropertyController {
  constructor(private readonly propertyService: PropertyService) {}

  @Get()
  list(@Query() query: ListPropertiesDto) {
    return this.propertyService.list(query);
  }

  // Home page — dat truoc ':slug' de khong bi nuot route.
  @Get('popular')
  listPopular(@Query() query: ListPopularPropertiesDto) {
    return this.propertyService.listPopular(query);
  }

  @Get('mine')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  listMine(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: ListPropertiesDto,
  ) {
    return this.propertyService.listMine(BigInt(user.id), query);
  }

  @Get('moderation')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  listForModeration(@Query() query: ListPropertiesDto) {
    return this.propertyService.listForModeration(query);
  }

  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.propertyService.getBySlug(slug);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreatePropertyDto,
  ) {
    return this.propertyService.create(BigInt(user.id), dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdatePropertyDto,
  ) {
    return this.propertyService.update(BigInt(user.id), parseIdParam(id), dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.propertyService.remove(BigInt(user.id), parseIdParam(id));
  }

  @Patch(':id/review')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  review(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: ReviewPropertyDto,
  ) {
    return this.propertyService.review(
      BigInt(user.id),
      user.role,
      parseIdParam(id),
      dto.status,
      dto.reason,
    );
  }
}
