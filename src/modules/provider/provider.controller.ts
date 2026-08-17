import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
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
import { ApplyProviderDto } from './dto/apply-provider.dto';
import { CreateOrganizationMemberDto } from './dto/create-organization-member.dto';
import { ListProvidersDto } from './dto/list-providers.dto';
import { ReviewProviderDto } from './dto/review-provider.dto';
import { SuspendProviderDto } from './dto/suspend-provider.dto';
import { UpdateCommissionRateDto } from './dto/update-commission-rate.dto';
import { UpdateOrganizationMemberDto } from './dto/update-organization-member.dto';
import { OrganizationMemberService } from './organization-member.service';
import { ProviderService } from './provider.service';

@ApiTags('Provider')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('providers')
export class ProviderController {
  constructor(
    private readonly providerService: ProviderService,
    private readonly organizationMemberService: OrganizationMemberService,
  ) {}

  @Post('apply')
  apply(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ApplyProviderDto,
  ) {
    return this.providerService.apply(BigInt(user.id), dto);
  }

  @Get('me')
  getMine(@CurrentUser() user: CurrentUserPayload) {
    return this.providerService.getMine(BigInt(user.id));
  }

  @Post('members')
  createMember(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateOrganizationMemberDto,
  ) {
    return this.organizationMemberService.createMember(BigInt(user.id), dto);
  }

  @Get('members')
  listMembers(@CurrentUser() user: CurrentUserPayload) {
    return this.organizationMemberService.listMembers(BigInt(user.id));
  }

  @Patch('members/:id')
  updateMember(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationMemberDto,
  ) {
    return this.organizationMemberService.updateMemberRole(
      BigInt(user.id),
      parseIdParam(id),
      dto.role,
    );
  }

  @Delete('members/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.organizationMemberService.removeMember(
      BigInt(user.id),
      parseIdParam(id),
    );
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  list(@Query() query: ListProvidersDto) {
    return this.providerService.list(query);
  }

  @Patch(':id/review')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  review(@Param('id') id: string, @Body() dto: ReviewProviderDto) {
    return this.providerService.review(
      parseIdParam(id),
      dto.status,
      dto.reason,
    );
  }

  @Patch(':id/suspend')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  suspend(@Param('id') id: string, @Body() dto: SuspendProviderDto) {
    return this.providerService.suspend(parseIdParam(id), dto.reason);
  }

  @Patch(':id/unsuspend')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  unsuspend(@Param('id') id: string) {
    return this.providerService.unsuspend(parseIdParam(id));
  }

  @Patch(':id/commission-rate')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  updateCommissionRate(
    @Param('id') id: string,
    @Body() dto: UpdateCommissionRateDto,
  ) {
    return this.providerService.updateCommissionRate(
      parseIdParam(id),
      dto.commissionRate,
    );
  }
}
