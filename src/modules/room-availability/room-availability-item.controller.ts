import { Body, Controller, Patch, UseGuards, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard, AuthenticatedUser } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { parseIdParam } from '../../shared/utils/parse-id';
import { RoomAvailabilityService } from './room-availability.service';
import { UpdateRoomAvailabilityDto } from './dto/update-room-availability.dto';

@ApiTags('room-availability')
@Controller('room-availability')
export class RoomAvailabilityItemController {
  constructor(private readonly roomAvailabilityService: RoomAvailabilityService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PARTNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRoomAvailabilityDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.roomAvailabilityService.update(parseIdParam(id), dto, user);
  }
}
