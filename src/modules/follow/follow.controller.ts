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
import { AddFollowDto } from './dto/add-follow.dto';
import { FollowService } from './follow.service';

@ApiTags('Follow')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('follows')
export class FollowController {
  constructor(private readonly followService: FollowService) {}

  @Get('mine')
  listFollowing(@CurrentUser() user: CurrentUserPayload) {
    return this.followService.listFollowing(BigInt(user.id));
  }

  @Get('followers')
  listFollowers(@CurrentUser() user: CurrentUserPayload) {
    return this.followService.listFollowers(BigInt(user.id));
  }

  @Post()
  add(@CurrentUser() user: CurrentUserPayload, @Body() dto: AddFollowDto) {
    return this.followService.add(BigInt(user.id), dto.followingId);
  }

  @Delete(':followingId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: CurrentUserPayload,
    @Param('followingId') followingId: string,
  ) {
    return this.followService.remove(
      BigInt(user.id),
      parseIdParam(followingId),
    );
  }
}
