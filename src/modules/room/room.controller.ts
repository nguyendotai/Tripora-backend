import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard, AuthenticatedUser } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { parseIdParam } from '../../shared/utils/parse-id';
import { RoomService } from './room.service';
import { CreateRoomDto } from './dto/create-room.dto';

@ApiTags('rooms')
@Controller('properties/:propertyId/rooms')
export class PropertyRoomController {
  constructor(private readonly roomService: RoomService) {}

  @Get()
  findAll(@Param('propertyId') propertyId: string) {
    return this.roomService.findAllPublic(parseIdParam(propertyId));
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PARTNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('mine')
  findAllMine(@Param('propertyId') propertyId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.roomService.findAllMine(parseIdParam(propertyId), user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PARTNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post()
  create(
    @Param('propertyId') propertyId: string,
    @Body() dto: CreateRoomDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.roomService.create(parseIdParam(propertyId), dto, user);
  }
}
