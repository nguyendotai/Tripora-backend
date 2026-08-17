import { Injectable, NotFoundException } from '@nestjs/common';
import { Promotion } from '@prisma/client';
import { buildPaginated, resolvePagination } from '../../shared/utils/pagination';
import { CouponRepository } from './coupon.repository';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { ListPromotionsDto } from './dto/list-promotions.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

/** CRUD Admin cho Promotion (giam gia tu dong, khong can ma) — tach rieng khoi CouponService
 * (chi lo phan validate/apply luc tao Booking) de moi Service dung 1 trach nhiem, cung dung chung
 * CouponRepository (Coupon/Promotion o chung 1 module, khong tach module rieng). */
@Injectable()
export class PromotionService {
  constructor(private readonly couponRepository: CouponRepository) {}

  async listAll(query: ListPromotionsDto) {
    const { page, limit, skip, take } = resolvePagination(query);
    const [items, totalItems] = await this.couponRepository.findAllPromotions(skip, take);
    return buildPaginated(items, totalItems, page, limit);
  }

  async getById(id: bigint): Promise<Promotion> {
    const promotion = await this.couponRepository.findPromotionById(id);
    if (!promotion) {
      throw new NotFoundException('Promotion not found');
    }
    return promotion;
  }

  create(dto: CreatePromotionDto): Promise<Promotion> {
    return this.couponRepository.createPromotion({
      name: dto.name,
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      maxDiscountAmount: dto.maxDiscountAmount,
      minOrderAmount: dto.minOrderAmount,
      applicableDomains: dto.applicableDomains,
      priority: dto.priority,
      validFrom: new Date(dto.validFrom),
      validUntil: new Date(dto.validUntil),
      status: dto.status,
    });
  }

  async update(id: bigint, dto: UpdatePromotionDto): Promise<Promotion> {
    await this.getById(id);
    return this.couponRepository.updatePromotion(id, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.discountType !== undefined && { discountType: dto.discountType }),
      ...(dto.discountValue !== undefined && { discountValue: dto.discountValue }),
      ...(dto.maxDiscountAmount !== undefined && { maxDiscountAmount: dto.maxDiscountAmount }),
      ...(dto.minOrderAmount !== undefined && { minOrderAmount: dto.minOrderAmount }),
      ...(dto.applicableDomains !== undefined && { applicableDomains: dto.applicableDomains }),
      ...(dto.priority !== undefined && { priority: dto.priority }),
      ...(dto.validFrom !== undefined && { validFrom: new Date(dto.validFrom) }),
      ...(dto.validUntil !== undefined && { validUntil: new Date(dto.validUntil) }),
      ...(dto.status !== undefined && { status: dto.status }),
    });
  }

  async remove(id: bigint): Promise<void> {
    await this.getById(id);
    await this.couponRepository.deletePromotion(id);
  }
}
