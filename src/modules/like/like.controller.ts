import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../common/decorators/current-user.decorator';
import { parseIdParam } from '../../shared/utils/parse-id';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AddLikeDto } from './dto/add-like.dto';
import { LikeService } from './like.service';

@ApiTags('Like')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('likes')
export class LikeController {
  constructor(private readonly likeService: LikeService) {}

  @Get('mine')
  listMine(@CurrentUser() user: CurrentUserPayload) {
    return this.likeService.list(BigInt(user.id));
  }

  @Post()
  add(@CurrentUser() user: CurrentUserPayload, @Body() dto: AddLikeDto) {
    return this.likeService.add(BigInt(user.id), dto.postId);
  }

  @Delete(':postId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: CurrentUserPayload,
    @Param('postId') postId: string,
  ) {
    return this.likeService.remove(BigInt(user.id), parseIdParam(postId));
  }
}
