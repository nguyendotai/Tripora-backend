import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { BookingDomain, Coupon, DiscountType, Prisma } from '@prisma/client';
import { CouponRepository } from './coupon.repository';

export interface ApplyDiscountParams {
  userId: bigint;
  bookingDomain: BookingDomain;
  bookingId: bigint;
  subtotal: Prisma.Decimal;
  couponCode?: string;
}

export interface ApplyDiscountResult {
  discountAmount: Prisma.Decimal;
  appliedCouponId?: bigint;
  appliedPromotionId?: bigint;
}

@Injectable()
export class CouponService {
  private readonly logger = new Logger(CouponService.name);

  constructor(private readonly couponRepository: CouponRepository) {}

  /**
   * Goi TRUOC khi tao Booking — chi kiem tra ma hop le/con han/dung domain/chua het luot (khong
   * biet subtotal that o buoc nay vi gia co the khac gia niem yet theo Schedule). Sai thi 400
   * ngay, chua dung toi ton kho. Khong lam gi neu khong co couponCode (Promotion tu dong danh gia
   * o applyDiscount, khong can validate truoc vi khong phai input nguoi dung).
   */
  async validateCode(
    userId: bigint,
    bookingDomain: BookingDomain,
    couponCode?: string,
  ): Promise<void> {
    if (!couponCode) return;

    const coupon = await this.couponRepository.findByCode(
      this.normalize(couponCode),
    );
    if (!coupon) {
      throw new BadRequestException('Invalid coupon code');
    }
    this.assertUsable(coupon, bookingDomain);

    if (coupon.perUserLimit !== null) {
      const used = await this.couponRepository.countRedemptionsByUser(
        coupon.id,
        userId,
      );
      if (used >= coupon.perUserLimit) {
        throw new BadRequestException('You have already used this coupon');
      }
    }
  }

  /**
   * Goi SAU khi tao Booking thanh cong (da biet subtotal that + co bookingId de ghi redemption).
   * Uu tien Coupon neu co ma hop le; khong co ma thi tu ap Promotion dang chay khop tot nhat;
   * khong co gi thi khong giam. Coupon: tang usedCount atomic — thua race hiem gap hoac
   * minOrderAmount khong dat (chi phat hien duoc luc nay) thi fail-open (khong giam, log warning)
   * thay vi rollback ca Booking da tao — danh doi co chu dich, ghi trong PR.
   */
  async applyDiscount(
    params: ApplyDiscountParams,
  ): Promise<ApplyDiscountResult> {
    if (params.couponCode) {
      return this.applyCoupon(params);
    }
    return this.applyBestPromotion(params);
  }

  private async applyCoupon(
    params: ApplyDiscountParams,
  ): Promise<ApplyDiscountResult> {
    const code = this.normalize(params.couponCode as string);
    const coupon = await this.couponRepository.findByCode(code);
    if (!coupon) {
      this.logger.warn(
        `Coupon ${code} disappeared between validate and apply — no discount applied`,
      );
      return { discountAmount: new Prisma.Decimal(0) };
    }

    try {
      this.assertUsable(coupon, params.bookingDomain);
      if (params.subtotal.lt(coupon.minOrderAmount)) {
        throw new Error('minOrderAmount not met');
      }
    } catch (error) {
      this.logger.warn(
        `Coupon ${code} no longer usable at apply time for booking ${params.bookingDomain}#${params.bookingId} — no discount applied (${error instanceof Error ? error.message : error})`,
      );
      return { discountAmount: new Prisma.Decimal(0) };
    }

    const discountAmount = this.computeDiscount(
      params.subtotal,
      coupon.discountType,
      coupon.discountValue,
      coupon.maxDiscountAmount,
    );

    const redeemed = await this.couponRepository.redeem({
      couponId: coupon.id,
      userId: params.userId,
      bookingDomain: params.bookingDomain,
      bookingId: params.bookingId,
      discountAmount: discountAmount.toString(),
    });
    if (!redeemed) {
      this.logger.warn(
        `Coupon ${code} lost the usage-limit race for booking ${params.bookingDomain}#${params.bookingId} — no discount applied`,
      );
      return { discountAmount: new Prisma.Decimal(0) };
    }

    return { discountAmount, appliedCouponId: coupon.id };
  }

  private async applyBestPromotion(
    params: ApplyDiscountParams,
  ): Promise<ApplyDiscountResult> {
    const promotion = await this.couponRepository.findBestActivePromotion({
      bookingDomain: params.bookingDomain,
      subtotal: params.subtotal.toString(),
      now: new Date(),
    });
    if (!promotion) {
      return { discountAmount: new Prisma.Decimal(0) };
    }

    const discountAmount = this.computeDiscount(
      params.subtotal,
      promotion.discountType,
      promotion.discountValue,
      promotion.maxDiscountAmount,
    );
    return { discountAmount, appliedPromotionId: promotion.id };
  }

  private assertUsable(coupon: Coupon, bookingDomain: BookingDomain): void {
    const now = new Date();
    if (coupon.status !== 'ACTIVE') {
      throw new BadRequestException('This coupon is no longer active');
    }
    if (now < coupon.validFrom || now > coupon.validUntil) {
      throw new BadRequestException(
        'This coupon has expired or is not active yet',
      );
    }
    const domains = coupon.applicableDomains as string[] | null;
    if (domains && !domains.includes(bookingDomain)) {
      throw new BadRequestException(
        'This coupon is not valid for this booking type',
      );
    }
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('This coupon has reached its usage limit');
    }
  }

  private computeDiscount(
    subtotal: Prisma.Decimal,
    discountType: DiscountType,
    discountValue: Prisma.Decimal,
    maxDiscountAmount: Prisma.Decimal | null,
  ): Prisma.Decimal {
    let discount =
      discountType === 'PERCENT'
        ? subtotal.mul(discountValue).div(100)
        : new Prisma.Decimal(discountValue);

    if (maxDiscountAmount && discount.gt(maxDiscountAmount)) {
      discount = new Prisma.Decimal(maxDiscountAmount);
    }
    if (discount.gt(subtotal)) {
      discount = subtotal;
    }
    if (discount.lt(0)) {
      discount = new Prisma.Decimal(0);
    }
    return discount;
  }

  private normalize(code: string): string {
    return code.trim().toUpperCase();
  }
}
