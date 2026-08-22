import { Module } from '@nestjs/common';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { ProviderModule } from '../provider/provider.module';
import { CommissionController } from './commission.controller';
import { CommissionRepository } from './commission.repository';
import { CommissionService } from './commission.service';

/** Module doc lap, khong import bat ky module Booking nao — lay providerId qua raw SQL join 1
 * lan theo bookingDomain (xem CommissionRepository), giong triet ly PaymentModule. PaymentModule
 * import CommissionModule (1 chieu) de goi luc webhook Payment SUCCESS; khong co chieu nguoc.
 * V7 vong 4: them ProviderModule de dung OrganizationMemberService cho GET /commissions/mine —
 * an toan, ProviderModule khong import nguoc lai CommissionModule/PaymentModule. */
@Module({
  imports: [ProviderModule, ActivityLogModule],
  controllers: [CommissionController],
  providers: [CommissionService, CommissionRepository],
  exports: [CommissionService],
})
export class CommissionModule {}
