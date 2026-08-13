import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ListRoomInventoryDto } from './dto/list-room-inventory.dto';
import { SetRoomInventoryDto } from './dto/set-room-inventory.dto';
import { RoomInventoryService } from './room-inventory.service';

@ApiTags('Room Inventory')
@Controller('room-inventory')
export class RoomInventoryController {
  constructor(private readonly roomInventoryService: RoomInventoryService) {}

  @Get()
  list(@Query() query: ListRoomInventoryDto) {
    return this.roomInventoryService.list(query);
  }

  @Get('mine')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  listMine(@CurrentUser() user: CurrentUserPayload, @Query() query: ListRoomInventoryDto) {
    return this.roomInventoryService.listMine(BigInt(user.id), query);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  set(@CurrentUser() user: CurrentUserPayload, @Body() dto: SetRoomInventoryDto) {
    return this.roomInventoryService.set(BigInt(user.id), dto);
  }
}
