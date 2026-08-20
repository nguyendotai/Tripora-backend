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
import { CreateCommentDto } from './dto/create-comment.dto';
import { ListCommentsDto } from './dto/list-comments.dto';
import { ListCommentsModerationDto } from './dto/list-comments-moderation.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentService } from './comment.service';

@ApiTags('Comment')
@Controller('comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Get('moderation')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  listForModeration(@Query() query: ListCommentsModerationDto) {
    return this.commentService.listForModeration(query);
  }

  @Get()
  list(@Query() query: ListCommentsDto) {
    return this.commentService.list(query);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentService.create(BigInt(user.id), dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.commentService.update(BigInt(user.id), parseIdParam(id), dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.commentService.remove(
      BigInt(user.id),
      user.role as Role,
      parseIdParam(id),
    );
  }
}
