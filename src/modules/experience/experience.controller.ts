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
import { CreateExperienceDto } from './dto/create-experience.dto';
import { ListExperiencesDto } from './dto/list-experiences.dto';
import { ReviewExperienceDto } from './dto/review-experience.dto';
import { UpdateExperienceDto } from './dto/update-experience.dto';
import { ExperienceService } from './experience.service';

@ApiTags('Experience')
@Controller('experiences')
export class ExperienceController {
  constructor(private readonly experienceService: ExperienceService) {}

  @Get()
  list(@Query() query: ListExperiencesDto) {
    return this.experienceService.list(query);
  }

  @Get('mine')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  listMine(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: ListExperiencesDto,
  ) {
    return this.experienceService.listMine(BigInt(user.id), query);
  }

  @Get('moderation')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  listForModeration(@Query() query: ListExperiencesDto) {
    return this.experienceService.listForModeration(query);
  }

  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.experienceService.getBySlug(slug);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateExperienceDto,
  ) {
    return this.experienceService.create(BigInt(user.id), dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateExperienceDto,
  ) {
    return this.experienceService.update(
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
    return this.experienceService.remove(BigInt(user.id), parseIdParam(id));
  }

  @Patch(':id/review')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  review(@Param('id') id: string, @Body() dto: ReviewExperienceDto) {
    return this.experienceService.review(
      parseIdParam(id),
      dto.status,
      dto.reason,
    );
  }
}
