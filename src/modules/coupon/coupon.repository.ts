import { Injectable } from '@nestjs/common';
import { BookingDomain, Coupon, Prisma, Promotion } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export interface RedeemCouponParams {
  couponId: bigint;
  userId: bigint;
  bookingDomain: BookingDomain;
  bookingId: bigint;
  discountAmount: string;
}

export interface FindBestPromotionParams {
  bookingDomain: BookingDomain;
  subtotal: string;
  now: Date;
  providerId: bigint;
}

@Injectable()
export class CouponRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByCode(code: string): Promise<Coupon | null> {
    return this.prisma.coupon.findUnique({ where: { code } });
  }

  countRedemptionsByUser(couponId: bigint, userId: bigint): Promise<number> {
    return this.prisma.couponRedemption.count({ where: { couponId, userId } });
  }

  /**
   * Tang usedCount atomic qua raw UPDATE ... WHERE usage_limit IS NULL OR used_count < usage_limit
   * (cung khuon voi tru ton kho o backend/CLAUDE.md muc 3), kiem tra affected rows. Chi ghi
   * CouponRedemption khi tang thanh cong — that lai (0 dong) tra ve false de goi ben tren fail-open.
   */
  async redeem(params: RedeemCouponParams): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const affected = await tx.$executeRaw`
        UPDATE coupons SET used_count = used_count + 1
        WHERE id = ${params.couponId} AND (usage_limit IS NULL OR used_count < usage_limit)
      `;
      if (affected === 0) return false;

      await tx.couponRedemption.create({
        data: {
          couponId: params.couponId,
          userId: params.userId,
          bookingDomain: params.bookingDomain,
          bookingId: params.bookingId,
          discountAmount: params.discountAmount,
        },
      });
      return true;
    });
  }

  /**
   * Dung boi BookingExpirationService — khi 1 Booking PENDING_PAYMENT co dung Coupon bi cron danh
   * EXPIRED, hoan lai usedCount + xoa CouponRedemption tuong ung de khong lang phi 1 luot dung.
   */
  async rollbackForExpiredBookings(
    bookingDomain: BookingDomain,
    bookingIds: bigint[],
  ): Promise<void> {
    if (bookingIds.length === 0) return;

    const redemptions = await this.prisma.couponRedemption.findMany({
      where: { bookingDomain, bookingId: { in: bookingIds } },
      select: { id: true, couponId: true },
    });

    for (const redemption of redemptions) {
      await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`
          UPDATE coupons SET used_count = used_count - 1 WHERE id = ${redemption.couponId} AND used_count > 0
        `;
        await tx.couponRedemption.delete({ where: { id: redemption.id } });
      });
    }
  }

  /**
   * Loc theo ACTIVE/con han/minOrderAmount o DB, loc tiep applicableDomains (Json array) o JS —
   * MySQL/Prisma khong ho tro filter "array contains" 1 cau portable, bang Promotion du nho de
   * chap nhan duoc. uu tien priority cao hon, chi lay 1 ket qua tot nhat. Khop ca Promotion toan
   * san (providerId null, Admin tao) lan Promotion rieng cua dung Provider dang dat (V7 vong 11).
   */
  async findBestActivePromotion(
    params: FindBestPromotionParams,
  ): Promise<Promotion | null> {
    const candidates = await this.prisma.promotion.findMany({
      where: {
        status: 'ACTIVE',
        validFrom: { lte: params.now },
        validUntil: { gte: params.now },
        minOrderAmount: { lte: params.subtotal },
        OR: [{ providerId: null }, { providerId: params.providerId }],
      },
      orderBy: { priority: 'desc' },
    });

    const match = candidates.find((promotion) => {
      const domains = promotion.applicableDomains as string[] | null;
      return !domains || domains.includes(params.bookingDomain);
    });
    return match ?? null;
  }

  // ==================== Coupon CRUD (Admin) ====================

  createCoupon(data: Prisma.CouponCreateInput): Promise<Coupon> {
    return this.prisma.coupon.create({ data });
  }

  findCouponById(id: bigint): Promise<Coupon | null> {
    return this.prisma.coupon.findUnique({ where: { id } });
  }

  updateCoupon(id: bigint, data: Prisma.CouponUpdateInput): Promise<Coupon> {
    return this.prisma.coupon.update({ where: { id }, data });
  }

  deleteCoupon(id: bigint): Promise<Coupon> {
    return this.prisma.coupon.delete({ where: { id } });
  }

  async findAllCoupons(
    where: Prisma.CouponWhereInput,
    skip: number,
    take: number,
  ): Promise<[Coupon[], number]> {
    return this.prisma.$transaction([
      this.prisma.coupon.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.coupon.count({ where }),
    ]);
  }

  /** Home page "Uu dai noi bat" — chi lay Promotion toan san (providerId null), Promotion rieng
   * cua 1 Provider can ngu canh san pham nen khong hop de hien an danh o Home. */
  findActivePromotions(limit: number, now: Date): Promise<Promotion[]> {
    return this.prisma.promotion.findMany({
      where: {
        status: 'ACTIVE',
        providerId: null,
        validFrom: { lte: now },
        validUntil: { gte: now },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });
  }

  // ==================== Promotion CRUD (Admin) ====================

  createPromotion(data: Prisma.PromotionCreateInput): Promise<Promotion> {
    return this.prisma.promotion.create({ data });
  }

  findPromotionById(id: bigint): Promise<Promotion | null> {
    return this.prisma.promotion.findUnique({ where: { id } });
  }

  updatePromotion(id: bigint, data: Prisma.PromotionUpdateInput): Promise<Promotion> {
    return this.prisma.promotion.update({ where: { id }, data });
  }

  deletePromotion(id: bigint): Promise<Promotion> {
    return this.prisma.promotion.delete({ where: { id } });
  }

  async findAllPromotions(skip: number, take: number): Promise<[Promotion[], number]> {
    return this.prisma.$transaction([
      this.prisma.promotion.findMany({ skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.promotion.count(),
    ]);
  }

  // ==================== Promotion CRUD (Provider tu quan ly, V7 vong 11) ====================

  async findPromotionsByProvider(
    providerId: bigint,
    skip: number,
    take: number,
  ): Promise<[Promotion[], number]> {
    const where: Prisma.PromotionWhereInput = { providerId };
    return this.prisma.$transaction([
      this.prisma.promotion.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.promotion.count({ where }),
    ]);
  }
}
