import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { BookingDomain, Prisma } from '@prisma/client';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { OrganizationMemberService } from '../provider/organization-member.service';
import { ProviderRepository } from '../provider/provider.repository';
import {
  buildPaginated,
  resolvePagination,
} from '../../shared/utils/pagination';
import { groupCommissionsByDay } from '../../shared/utils/group-commissions-by-day';
import { CommissionRepository } from './commission.repository';
import { ListCommissionsDto } from './dto/list-commissions.dto';
import { ListMyCommissionsDto } from './dto/list-my-commissions.dto';

export interface RecordCommissionParams {
  paymentId: bigint;
  bookingDomain: BookingDomain;
  bookingId: bigint;
  amount: Prisma.Decimal;
}

@Injectable()
export class CommissionService {
  private readonly logger = new Logger(CommissionService.name);

  constructor(
    private readonly commissionRepository: CommissionRepository,
    private readonly organizationMemberService: OrganizationMemberService,
    private readonly providerRepository: ProviderRepository,
    private readonly activityLogService: ActivityLogService,
  ) {}

  /**
   * Goi tu PaymentService.handleWebhook SAU KHI Payment SUCCESS — best-effort, khong duoc nem loi
   * ra ngoai (loi o day khong duoc lam hong response webhook tra ve cho Stripe, cung triet ly voi
   * Notification). Khong tu dieu chinh/hoan lai Commission khi Booking sau do bi Refund — Payout/
   * doi soat thuoc pham vi V7 Marketplace, ghi ro gioi han nay.
   */
  async recordForPayment(params: RecordCommissionParams): Promise<void> {
    try {
      const providerId = await this.commissionRepository.resolveProviderId(
        params.bookingDomain,
        params.bookingId,
      );
      if (!providerId) {
        this.logger.error(
          `Could not resolve providerId for ${params.bookingDomain}#${params.bookingId} — skipping Commission`,
        );
        return;
      }

      const rate =
        await this.commissionRepository.getCommissionRate(providerId);
      if (!rate) {
        this.logger.error(
          `Provider ${providerId} has no commissionRate — skipping Commission`,
        );
        return;
      }

      const platformAmount = params.amount.mul(rate);
      const providerAmount = params.amount.sub(platformAmount);

      await this.commissionRepository.create({
        providerId,
        paymentId: params.paymentId,
        bookingDomain: params.bookingDomain,
        bookingId: params.bookingId,
        grossAmount: params.amount,
        rate,
        platformAmount,
        providerAmount,
      });
    } catch (error) {
      this.logger.error(
        `Failed to record Commission for payment ${params.paymentId}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }

  /** V9 vong 2 — dung boi PaymentService de notify Provider "Booking moi". Tai su dung dung logic
   * resolve Booking -> Provider da co san o day (PROVIDER_LOOKUP_SQL cho ca 5 domain), tranh viet
   * lai lan 2 o PaymentModule. */
  async resolveProviderUserId(
    bookingDomain: BookingDomain,
    bookingId: bigint,
  ): Promise<bigint | null> {
    const providerId = await this.commissionRepository.resolveProviderId(
      bookingDomain,
      bookingId,
    );
    if (!providerId) return null;

    const provider = await this.providerRepository.findById(providerId);
    return provider?.userId ?? null;
  }

  /** Admin — xem toan bo Commission, optional loc theo 1 Provider. */
  async listAll(query: ListCommissionsDto) {
    const { page, limit, skip, take } = resolvePagination(query);
    const where: Prisma.CommissionWhereInput = {
      ...(query.providerId && { providerId: BigInt(query.providerId) }),
    };

    const [items, totalItems] = await this.commissionRepository.findAll(
      where,
      skip,
      take,
    );
    return buildPaginated(items, totalItems, page, limit);
  }

  /** Provider (Owner/Manager/Finance Staff) tu xem doanh thu cua chinh to chuc minh. */
  async listMine(userId: bigint, query: ListMyCommissionsDto) {
    const { provider } = await this.organizationMemberService.requireMembership(
      userId,
      {
        permission: 'finance:view',
      },
    );
    const { page, limit, skip, take } = resolvePagination(query);

    const [items, totalItems] =
      await this.commissionRepository.findByProviderId(provider.id, skip, take);
    return buildPaginated(items, totalItems, page, limit);
  }

  /** V7 vong 6 — so lieu tong hop cho trang Overview cua Provider, cung quyen voi listMine. */
  async getMySummary(userId: bigint) {
    const { provider } = await this.organizationMemberService.requireMembership(
      userId,
      {
        permission: 'finance:view',
      },
    );
    return this.commissionRepository.getSummary(provider.id);
  }

  /** V7 vong 8 — doanh thu + so giao dich theo ngay, 30 ngay gan nhat, cung quyen voi listMine. */
  async getMyAnalytics(userId: bigint) {
    const { provider } = await this.organizationMemberService.requireMembership(
      userId,
      {
        permission: 'finance:view',
      },
    );
    const days = 30;
    const today = new Date(
      `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`,
    );
    const since = new Date(today);
    since.setUTCDate(since.getUTCDate() - (days - 1));

    const commissions = await this.commissionRepository.findByProviderIdSince(
      provider.id,
      since,
    );
    return groupCommissionsByDay(commissions, days);
  }

  /** Admin danh dau 1 Commission da tra cho Provider (chuyen khoan ngoai he thong) — toi gian,
   * tung dong 1, khong batch/khong tich hop API chuyen tien that. */
  async markPaidOut(actorId: bigint, actorRole: string, id: bigint) {
    const commission = await this.commissionRepository.findById(id);
    if (!commission) {
      throw new NotFoundException('Commission not found');
    }
    const updated = await this.commissionRepository.updatePayoutStatus(
      id,
      'PAID',
    );

    await this.activityLogService.log({
      actorId,
      actorRole,
      action: 'commission.markPaidOut',
      entityType: 'commission',
      entityId: id,
    });

    return updated;
  }
}
