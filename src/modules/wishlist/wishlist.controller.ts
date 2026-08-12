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
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { parseIdParam } from '../../shared/utils/parse-id';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AddWishlistItemDto } from './dto/add-wishlist-item.dto';
import { WishlistService } from './wishlist.service';

@ApiTags('Wishlist')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  list(@CurrentUser() user: CurrentUserPayload) {
    return this.wishlistService.list(BigInt(user.id));
  }

  @Post()
  add(@CurrentUser() user: CurrentUserPayload, @Body() dto: AddWishlistItemDto) {
    return this.wishlistService.add(BigInt(user.id), dto.destinationId);
  }

  @Delete(':destinationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: CurrentUserPayload,
    @Param('destinationId') destinationId: string,
  ) {
    return this.wishlistService.remove(BigInt(user.id), parseIdParam(destinationId));
  }
}
