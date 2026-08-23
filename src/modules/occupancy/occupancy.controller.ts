import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OccupancyService } from './occupancy.service';

@ApiTags('Occupancy')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('occupancy')
export class OccupancyController {
  constructor(private readonly occupancyService: OccupancyService) {}

  @Get('mine')
  getMine(@CurrentUser() user: CurrentUserPayload) {
    return this.occupancyService.getMine(BigInt(user.id));
  }
}
