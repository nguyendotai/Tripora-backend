import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { parseIdParam } from '../../shared/utils/parse-id';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CommissionService } from './commission.service';
import { ListCommissionsDto } from './dto/list-commissions.dto';
import { ListMyCommissionsDto } from './dto/list-my-commissions.dto';

@ApiTags('Commission')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('commissions')
export class CommissionController {
  constructor(private readonly commissionService: CommissionService) {}

  @Get('mine')
  listMine(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: ListMyCommissionsDto,
  ) {
    return this.commissionService.listMine(BigInt(user.id), query);
  }

  @Get('mine/summary')
  getMySummary(@CurrentUser() user: CurrentUserPayload) {
    return this.commissionService.getMySummary(BigInt(user.id));
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  listAll(@Query() query: ListCommissionsDto) {
    return this.commissionService.listAll(query);
  }

  @Patch(':id/payout')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  markPaidOut(@Param('id') id: string) {
    return this.commissionService.markPaidOut(parseIdParam(id));
  }
}
