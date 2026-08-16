import { Module } from '@nestjs/common';
import { CommissionController } from './commission.controller';
import { CommissionRepository } from './commission.repository';
import { CommissionService } from './commission.service';

/** Module doc lap, khong import bat ky module Booking nao — lay providerId qua raw SQL join 1
 * lan theo bookingDomain (xem CommissionRepository), giong triet ly PaymentModule. PaymentModule
 * import CommissionModule (1 chieu) de goi luc webhook Payment SUCCESS; khong co chieu nguoc. */
@Module({
  controllers: [CommissionController],
  providers: [CommissionService, CommissionRepository],
  exports: [CommissionService],
})
export class CommissionModule {}
