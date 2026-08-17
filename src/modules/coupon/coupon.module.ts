import { Module } from '@nestjs/common';
import { CouponController } from './coupon.controller';
import { CouponRepository } from './coupon.repository';
import { CouponService } from './coupon.service';
import { PromotionController } from './promotion.controller';
import { PromotionService } from './promotion.service';

/** Module doc lap, khong import bat ky module Booking nao — ca 5 module Booking va
 * BookingExpirationModule import CouponModule (giong cach import PaymentModule), khong co
 * chieu nguoc nao, khong co rui ro circular dependency. Promotion dung chung CouponRepository
 * (cung 1 module) thay vi tach PromotionModule rieng — 2 entity lien quan chat, khong can tach. */
@Module({
  controllers: [CouponController, PromotionController],
  providers: [CouponService, PromotionService, CouponRepository],
  exports: [CouponService, CouponRepository],
})
export class CouponModule {}
