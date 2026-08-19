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
import { CreateMyPromotionDto } from './dto/create-my-promotion.dto';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { ListPromotionsDto } from './dto/list-promotions.dto';
import { UpdateMyPromotionDto } from './dto/update-my-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { PromotionService } from './promotion.service';

@ApiTags('Promotion')
@ApiBearerAuth()
@Controller('promotions')
export class PromotionController {
  constructor(private readonly promotionService: PromotionService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  list(@Query() query: ListPromotionsDto) {
    return this.promotionService.listAll(query);
  }

  // Provider tu quan ly Promotion cua chinh minh (V7 vong 11) — dat truoc ':id' de khong bi nuot route.
  @Get('mine')
  @UseGuards(JwtAuthGuard)
  listMine(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: ListPromotionsDto,
  ) {
    return this.promotionService.listMine(BigInt(user.id), query);
  }

  @Post('mine')
  @UseGuards(JwtAuthGuard)
  createMine(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateMyPromotionDto,
  ) {
    return this.promotionService.createMine(BigInt(user.id), dto);
  }

  @Patch('mine/:id')
  @UseGuards(JwtAuthGuard)
  updateMine(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateMyPromotionDto,
  ) {
    return this.promotionService.updateMine(
      BigInt(user.id),
      parseIdParam(id),
      dto,
    );
  }

  @Delete('mine/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMine(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.promotionService.removeMine(BigInt(user.id), parseIdParam(id));
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  getById(@Param('id') id: string) {
    return this.promotionService.getById(parseIdParam(id));
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() dto: CreatePromotionDto) {
    return this.promotionService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdatePromotionDto) {
    return this.promotionService.update(parseIdParam(id), dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.promotionService.remove(parseIdParam(id));
  }
}
