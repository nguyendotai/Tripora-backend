import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard, AuthenticatedUser } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { parseIdParam } from '../../shared/utils/parse-id';
import { RoomAvailabilityService } from './room-availability.service';
import { UpsertRoomAvailabilityDto } from './dto/upsert-room-availability.dto';
import { ListRoomAvailabilityDto } from './dto/list-room-availability.dto';

@ApiTags('room-availability')
@Controller('rooms/:roomId/availability')
export class RoomAvailabilityController {
  constructor(private readonly roomAvailabilityService: RoomAvailabilityService) {}

  @Get()
  findAll(@Param('roomId') roomId: string, @Query() query: ListRoomAvailabilityDto) {
    return this.roomAvailabilityService.findAll(parseIdParam(roomId), query);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PARTNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post()
  upsert(
    @Param('roomId') roomId: string,
    @Body() dto: UpsertRoomAvailabilityDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.roomAvailabilityService.upsert(parseIdParam(roomId), dto, user);
  }
}
