import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { BookingDomain, Prisma } from '@prisma/client';
import { OrganizationMemberService } from '../provider/organization-member.service';
import {
  buildPaginated,
  resolvePagination,
} from '../../shared/utils/pagination';
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

  /** Admin danh dau 1 Commission da tra cho Provider (chuyen khoan ngoai he thong) — toi gian,
   * tung dong 1, khong batch/khong tich hop API chuyen tien that. */
  async markPaidOut(id: bigint) {
    const commission = await this.commissionRepository.findById(id);
    if (!commission) {
      throw new NotFoundException('Commission not found');
    }
    return this.commissionRepository.updatePayoutStatus(id, 'PAID');
  }
}
