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
import { AddSavedPostDto } from './dto/add-saved-post.dto';
import { SavedPostService } from './saved-post.service';

@ApiTags('SavedPost')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('saved-posts')
export class SavedPostController {
  constructor(private readonly savedPostService: SavedPostService) {}

  @Get('mine')
  listMine(@CurrentUser() user: CurrentUserPayload) {
    return this.savedPostService.list(BigInt(user.id));
  }

  @Post()
  add(@CurrentUser() user: CurrentUserPayload, @Body() dto: AddSavedPostDto) {
    return this.savedPostService.add(BigInt(user.id), dto.postId);
  }

  @Delete(':postId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: CurrentUserPayload,
    @Param('postId') postId: string,
  ) {
    return this.savedPostService.remove(BigInt(user.id), parseIdParam(postId));
  }
}
