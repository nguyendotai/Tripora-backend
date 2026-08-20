import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Promotion } from '@prisma/client';
import { OrganizationMemberService } from '../provider/organization-member.service';
import { providerTypeToBookingDomain } from '../../shared/utils/provider-type-to-booking-domain';
import { buildPaginated, clampLimit, resolvePagination } from '../../shared/utils/pagination';
import { CouponRepository } from './coupon.repository';
import { CreateMyPromotionDto } from './dto/create-my-promotion.dto';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { ListActivePromotionsDto } from './dto/list-active-promotions.dto';
import { ListPromotionsDto } from './dto/list-promotions.dto';
import { UpdateMyPromotionDto } from './dto/update-my-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

/** CRUD Admin cho Promotion (giam gia tu dong, khong can ma) — tach rieng khoi CouponService
 * (chi lo phan validate/apply luc tao Booking) de moi Service dung 1 trach nhiem, cung dung chung
 * CouponRepository (Coupon/Promotion o chung 1 module, khong tach module rieng). V7 vong 11 them
 * CRUD Provider tu quan ly Promotion cua chinh minh (providerId != null), mirror
 * PropertyService.listMine/getOwnedProperty: xem khong can permission rieng, tao/sua/xoa can
 * quyen 'promotion:manage' (chi Owner/Manager). */
@Injectable()
export class PromotionService {
  constructor(
    private readonly couponRepository: CouponRepository,
    private readonly organizationMemberService: OrganizationMemberService,
  ) {}

  /** Public — Home page "Uu dai noi bat". Khong phan trang, chi tra top N. */
  listActive(query: ListActivePromotionsDto) {
    const limit = clampLimit(query.limit, 6, 12);
    return this.couponRepository.findActivePromotions(limit, new Date());
  }

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

  // ==================== Provider tu quan ly (V7 vong 11) ====================

  /** Xem Promotion cua chinh to chuc minh — khong can permission rieng (mirror PropertyService.listMine). */
  async listMine(userId: bigint, query: ListPromotionsDto) {
    const { provider } =
      await this.organizationMemberService.requireMembership(userId);
    const { page, limit, skip, take } = resolvePagination(query);
    const [items, totalItems] =
      await this.couponRepository.findPromotionsByProvider(
        provider.id,
        skip,
        take,
      );
    return buildPaginated(items, totalItems, page, limit);
  }

  async createMine(
    userId: bigint,
    dto: CreateMyPromotionDto,
  ): Promise<Promotion> {
    const provider = await this.getOwnedProviderForManage(userId);
    return this.couponRepository.createPromotion({
      provider: { connect: { id: provider.id } },
      name: dto.name,
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      maxDiscountAmount: dto.maxDiscountAmount,
      minOrderAmount: dto.minOrderAmount,
      applicableDomains: [providerTypeToBookingDomain(provider.type)],
      priority: dto.priority,
      validFrom: new Date(dto.validFrom),
      validUntil: new Date(dto.validUntil),
      status: dto.status,
    });
  }

  async updateMine(
    userId: bigint,
    id: bigint,
    dto: UpdateMyPromotionDto,
  ): Promise<Promotion> {
    await this.getOwnedPromotion(userId, id);
    return this.couponRepository.updatePromotion(id, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.discountType !== undefined && {
        discountType: dto.discountType,
      }),
      ...(dto.discountValue !== undefined && {
        discountValue: dto.discountValue,
      }),
      ...(dto.maxDiscountAmount !== undefined && {
        maxDiscountAmount: dto.maxDiscountAmount,
      }),
      ...(dto.minOrderAmount !== undefined && {
        minOrderAmount: dto.minOrderAmount,
      }),
      ...(dto.priority !== undefined && { priority: dto.priority }),
      ...(dto.validFrom !== undefined && {
        validFrom: new Date(dto.validFrom),
      }),
      ...(dto.validUntil !== undefined && {
        validUntil: new Date(dto.validUntil),
      }),
      ...(dto.status !== undefined && { status: dto.status }),
    });
  }

  async removeMine(userId: bigint, id: bigint): Promise<void> {
    await this.getOwnedPromotion(userId, id);
    await this.couponRepository.deletePromotion(id);
  }

  private async getOwnedProviderForManage(userId: bigint) {
    const { provider } = await this.organizationMemberService.requireMembership(
      userId,
      { permission: 'promotion:manage' },
    );
    return provider;
  }

  private async getOwnedPromotion(userId: bigint, id: bigint) {
    const provider = await this.getOwnedProviderForManage(userId);
    const promotion = await this.getById(id);
    if (promotion.providerId !== provider.id) {
      throw new ForbiddenException('You do not own this promotion');
    }
    return promotion;
  }
}
