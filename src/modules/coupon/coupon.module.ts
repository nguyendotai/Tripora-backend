import { Module } from '@nestjs/common';
import { CouponRepository } from './coupon.repository';
import { CouponService } from './coupon.service';

/** Module doc lap, khong import bat ky module Booking nao — ca 5 module Booking va
 * BookingExpirationModule import CouponModule (giong cach import PaymentModule), khong co
 * chieu nguoc nao, khong co rui ro circular dependency. */
@Module({
  providers: [CouponService, CouponRepository],
  exports: [CouponService, CouponRepository],
})
export class CouponModule {}
