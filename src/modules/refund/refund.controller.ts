import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard, AuthenticatedUser } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { parseIdParam } from '../../shared/utils/parse-id';
import { RefundService } from './refund.service';
import { CompleteRefundDto } from './dto/complete-refund.dto';

@ApiTags('refunds')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('refunds')
export class RefundController {
  constructor(private readonly refundService: RefundService) {}

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':id/complete')
  complete(
    @Param('id') id: string,
    @Body() dto: CompleteRefundDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.refundService.complete(parseIdParam(id), dto, user);
  }
}
