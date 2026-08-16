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
import { CreateTransportRouteDto } from './dto/create-transport-route.dto';
import { ListTransportRoutesDto } from './dto/list-transport-routes.dto';
import { ReviewTransportRouteDto } from './dto/review-transport-route.dto';
import { UpdateTransportRouteDto } from './dto/update-transport-route.dto';
import { TransportRouteService } from './transport-route.service';

@ApiTags('Transport Route')
@Controller('transport-routes')
export class TransportRouteController {
  constructor(private readonly transportRouteService: TransportRouteService) {}

  @Get()
  list(@Query() query: ListTransportRoutesDto) {
    return this.transportRouteService.list(query);
  }

  @Get('mine')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  listMine(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: ListTransportRoutesDto,
  ) {
    return this.transportRouteService.listMine(BigInt(user.id), query);
  }

  @Get('moderation')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  listForModeration(@Query() query: ListTransportRoutesDto) {
    return this.transportRouteService.listForModeration(query);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.transportRouteService.getById(parseIdParam(id));
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateTransportRouteDto,
  ) {
    return this.transportRouteService.create(BigInt(user.id), dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateTransportRouteDto,
  ) {
    return this.transportRouteService.update(
      BigInt(user.id),
      parseIdParam(id),
      dto,
    );
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.transportRouteService.remove(BigInt(user.id), parseIdParam(id));
  }

  @Patch(':id/review')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  review(@Param('id') id: string, @Body() dto: ReviewTransportRouteDto) {
    return this.transportRouteService.review(
      parseIdParam(id),
      dto.status,
      dto.reason,
    );
  }
}
