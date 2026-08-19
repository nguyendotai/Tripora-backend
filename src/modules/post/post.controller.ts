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
import { parseIdParam } from '../../shared/utils/parse-id';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreatePostDto } from './dto/create-post.dto';
import { ListPostsDto } from './dto/list-posts.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostService } from './post.service';

@ApiTags('Post')
@Controller('posts')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Get('mine')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  listMine(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: ListPostsDto,
  ) {
    return this.postService.listMine(BigInt(user.id), query);
  }

  @Get()
  list(@Query() query: ListPostsDto) {
    return this.postService.list(query);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.postService.getById(parseIdParam(id));
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreatePostDto) {
    return this.postService.create(BigInt(user.id), dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdatePostDto,
  ) {
    return this.postService.update(BigInt(user.id), parseIdParam(id), dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.postService.remove(
      BigInt(user.id),
      user.role as Role,
      parseIdParam(id),
    );
  }
}
