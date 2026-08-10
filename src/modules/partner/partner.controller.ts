import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard, AuthenticatedUser } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { parseIdParam } from '../../shared/utils/parse-id';
import { PartnerService } from './partner.service';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { RejectPartnerDto } from './dto/reject-partner.dto';

@ApiTags('partners')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('partners')
export class PartnerController {
  constructor(private readonly partnerService: PartnerService) {}

  @Roles(UserRole.TRAVELER)
  @Post()
  create(@Body() dto: CreatePartnerDto, @CurrentUser() user: AuthenticatedUser) {
    return this.partnerService.create(dto, user);
  }

  @Roles(UserRole.TRAVELER, UserRole.PARTNER)
  @Get('me')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.partnerService.findMine(user);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('pending')
  findPending() {
    return this.partnerService.findPendingApproval();
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':id/verify')
  verify(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.partnerService.verify(parseIdParam(id), BigInt(user.id));
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':id/reject')
  reject(
    @Param('id') id: string,
    @Body() dto: RejectPartnerDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.partnerService.reject(parseIdParam(id), dto.reason, BigInt(user.id));
  }
}
