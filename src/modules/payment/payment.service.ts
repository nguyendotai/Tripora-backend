import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BookingDomain, Payment, Prisma } from '@prisma/client';
import Stripe from 'stripe';
import { CommissionService } from '../commission/commission.service';
import { NotificationService } from '../notification/notification.service';
import {
  buildPaginated,
  resolvePagination,
} from '../../shared/utils/pagination';
import { ListAllPaymentsDto } from './dto/list-all-payments.dto';
import { ListMyPaymentsDto } from './dto/list-my-payments.dto';
import { PaymentGatewayService } from './payment-gateway.service';
import { PaymentRepository } from './payment.repository';

export interface CreatePaymentForBookingParams {
  userId: bigint;
  bookingDomain: BookingDomain;
  bookingId: bigint;
  amount: Prisma.Decimal;
  discountAmount?: Prisma.Decimal;
  currency: string;
  description: string;
}

export interface CreateRefundForBookingParams {
  userId: bigint;
  bookingDomain: BookingDomain;
  bookingId: bigint;
  startDate: Date;
  reason?: string;
}

const DEFAULT_REFUND_FULL_DAYS = 7;
const DEFAULT_REFUND_PARTIAL_DAYS = 3;
const DEFAULT_REFUND_PARTIAL_PERCENT = 50;

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly paymentGateway: PaymentGatewayService,
    private readonly notificationService: NotificationService,
    private readonly commissionService: CommissionService,
    private readonly config: ConfigService,
  ) {}

  /** Goi ngay sau khi 1 trong 5 domain Booking tao Booking (status PENDING_PAYMENT) — tao
   * Payment (PENDING) + Checkout Session that, tra ve checkoutUrl de Frontend redirect. Booking
   * + Payment(PENDING) da commit truoc khi goi Stripe — neu Stripe loi (sai key, mang loi...),
   * khong de lo loi tho cua Stripe ra ngoai, Booking van con nguyen (khach xem duoc qua /mine,
   * job het han se tu don sau); bao 502 ro rang thay vi 401/500 tu Stripe. */
  async createForBooking(params: CreatePaymentForBookingParams) {
    const payment = await this.paymentRepository.create({
      userId: params.userId,
      bookingDomain: params.bookingDomain,
      bookingId: params.bookingId,
      amount: params.amount,
      discountAmount: params.discountAmount,
      currency: params.currency,
    });

    let session;
    try {
      session = await this.paymentGateway.createCheckoutSession({
        paymentId: payment.id,
        amount: params.amount,
        currency: params.currency,
        description: params.description,
      });
    } catch (error) {
      this.logger.error(
        `Stripe createCheckoutSession failed for payment ${payment.id}`,
        error instanceof Error ? error.stack : error,
      );
      throw new InternalServerErrorException(
        'Payment gateway is temporarily unavailable. Your booking is saved, please try again shortly.',
      );
    }
    await this.paymentRepository.setTransactionId(
      payment.id,
      session.sessionId,
    );

    return { payment, checkoutUrl: session.url };
  }

  async getById(userId: bigint, paymentId: bigint) {
    const payment = await this.paymentRepository.findById(paymentId);
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    if (payment.userId !== userId) {
      throw new ForbiddenException('You do not own this payment');
    }
    return payment;
  }

  /** Transaction history — toan bo Payment cua chinh user (kem Invoice/Refund neu co), phan trang. */
  async listMine(userId: bigint, query: ListMyPaymentsDto) {
    const { page, limit, skip, take } = resolvePagination(query);
    const [items, totalItems] = await this.paymentRepository.findManyByUser(
      userId,
      skip,
      take,
    );
    return buildPaginated(items, totalItems, page, limit);
  }

  /** Admin — Finance Dashboard: toan bo Payment (kem Invoice/Refund), optional loc theo status. */
  async listAll(query: ListAllPaymentsDto) {
    const { page, limit, skip, take } = resolvePagination(query);
    const where: Prisma.PaymentWhereInput = {
      ...(query.status && { status: query.status }),
    };
    const [items, totalItems] = await this.paymentRepository.findAll(where, skip, take);
    return buildPaginated(items, totalItems, page, limit);
  }

  /** Tao lai Checkout Session moi cho dung Payment da FAILED (hoac van con PENDING nhung khach
   * bam thu lai) — Booking van con PENDING_PAYMENT nen van con hop le de thanh toan tiep. */
  async retry(userId: bigint, paymentId: bigint) {
    const payment = await this.getById(userId, paymentId);
    if (payment.status === 'SUCCESS') {
      throw new BadRequestException('This payment has already succeeded');
    }

    let session;
    try {
      session = await this.paymentGateway.createCheckoutSession({
        paymentId: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        description: `Retry payment #${payment.id}`,
      });
    } catch (error) {
      this.logger.error(
        `Stripe createCheckoutSession (retry) failed for payment ${payment.id}`,
        error instanceof Error ? error.stack : error,
      );
      throw new InternalServerErrorException(
        'Payment gateway is temporarily unavailable. Please try again shortly.',
      );
    }
    await this.paymentRepository.resetForRetry(payment.id, session.sessionId);

    return { checkoutUrl: session.url };
  }

  /**
   * Goi tu cancel() cua ca 5 domain SAU KHI Booking da chuyen CONFIRMED -> CANCELLED thanh cong.
   * Tinh % hoan theo REFUND_FULL_DAYS/REFUND_PARTIAL_DAYS/REFUND_PARTIAL_PERCENT (so ngay tu hom
   * nay toi startDate). Khong co Payment SUCCESS tuong ung (vi du Booking chua tung thanh toan
   * that) thi bo qua, khong lam gi. Loi goi Stripe khong lam fail request huy cua khach — chi log
   * server-side, Refund/Booking giu PENDING/REFUND_PENDING cho xu ly thu cong (gioi han biet
   * truoc, khong co UI Admin retry-refund vong nay). Tra ve `refundPending` de caller (cancel()
   * cua tung domain) sua lai status tra ve HTTP response cho dung — Booking trong DB da sang
   * REFUND_PENDING nhung bien local `result.booking` da tao truoc do van con CANCELLED.
   */
  async createRefundForBooking(
    params: CreateRefundForBookingParams,
  ): Promise<{ refundPending: boolean }> {
    const payment = await this.paymentRepository.findSuccessfulPaymentByBooking(
      params.bookingDomain,
      params.bookingId,
    );
    if (!payment) return { refundPending: false };

    const { percent, amount } = this.computeRefundAmount(
      payment.amount,
      params.startDate,
    );

    const refund = await this.paymentRepository.createRefundRecord({
      paymentId: payment.id,
      userId: params.userId,
      bookingDomain: params.bookingDomain,
      bookingId: params.bookingId,
      amount,
      percent,
      reason: params.reason,
    });

    if (amount.lte(0)) return { refundPending: false };

    if (!payment.paymentIntentId) {
      this.logger.error(
        `Payment ${payment.id} has no paymentIntentId — cannot call Stripe refund API for refund ${refund.id}`,
      );
      return { refundPending: true };
    }

    try {
      const result = await this.paymentGateway.createRefund({
        paymentIntentId: payment.paymentIntentId,
        amount,
        refundId: refund.id,
      });
      await this.paymentRepository.setStripeRefundId(
        refund.id,
        result.stripeRefundId,
      );
    } catch (error) {
      this.logger.error(
        `Stripe createRefund failed for refund ${refund.id} (payment ${payment.id})`,
        error instanceof Error ? error.stack : error,
      );
    }

    return { refundPending: true };
  }

  private computeRefundAmount(
    paymentAmount: Prisma.Decimal,
    startDate: Date,
  ): { percent: number; amount: Prisma.Decimal } {
    // ConfigService.get<number>() khong tu ep kieu that (generic chi la khai bao TypeScript,
    // env var luon la string) — phai tu Number() de tranh loi tho ("50" thay vi 50).
    const fullDays = this.readIntEnv(
      'REFUND_FULL_DAYS',
      DEFAULT_REFUND_FULL_DAYS,
    );
    const partialDays = this.readIntEnv(
      'REFUND_PARTIAL_DAYS',
      DEFAULT_REFUND_PARTIAL_DAYS,
    );
    const partialPercent = this.readIntEnv(
      'REFUND_PARTIAL_PERCENT',
      DEFAULT_REFUND_PARTIAL_PERCENT,
    );

    const daysUntilStart = Math.floor(
      (startDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000),
    );

    let percent: number;
    if (daysUntilStart >= fullDays) {
      percent = 100;
    } else if (daysUntilStart >= partialDays) {
      percent = partialPercent;
    } else {
      percent = 0;
    }

    const amount = paymentAmount.mul(percent).div(100);
    return { percent, amount };
  }

  private readIntEnv(key: string, fallback: number): number {
    const raw = this.config.get<string>(key);
    const parsed = raw === undefined ? NaN : Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  /** Endpoint duy nhat duoc phep doi status Payment/Booking — verify chu ky truoc, cam nhan
   * truc tiep tu Frontend redirect (backend/CLAUDE.md muc 3). */
  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const event = this.paymentGateway.constructEvent(rawBody, signature);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const paymentId = this.extractPaymentId(session.metadata);
      if (paymentId === null) return;

      const paymentIntentId =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id;

      const applied = await this.paymentRepository.markSuccessAndConfirmBooking(
        paymentId,
        paymentIntentId,
      );
      if (applied) {
        const payment = await this.paymentRepository.findById(paymentId);
        if (payment) {
          await this.notificationService.notify(
            payment.userId,
            'Thanh toán thành công',
            `Đơn đặt chỗ #${payment.bookingId} của bạn đã được xác nhận sau khi thanh toán thành công.`,
          );
          await this.commissionService.recordForPayment({
            paymentId: payment.id,
            bookingDomain: payment.bookingDomain,
            bookingId: payment.bookingId,
            amount: payment.amount,
          });
          await this.notifyProviderOfNewBooking(payment);
        }
      }
      return;
    }

    if (event.type === 'checkout.session.expired') {
      const session = event.data.object;
      const paymentId = this.extractPaymentId(session.metadata);
      if (paymentId !== null) {
        await this.paymentRepository.markFailed(paymentId);
      }
      return;
    }

    if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object;
      const paymentId = this.extractPaymentId(intent.metadata);
      if (paymentId !== null) {
        await this.paymentRepository.markFailed(paymentId);
      }
      return;
    }

    if (event.type === 'refund.updated') {
      const refundObject = event.data.object;
      const refundId = this.extractId(refundObject.metadata, 'refundId');
      if (refundId === null) return;

      if (refundObject.status === 'succeeded') {
        const applied =
          await this.paymentRepository.markRefundSuccess(refundId);
        if (applied) {
          const refund = await this.paymentRepository.findRefundById(refundId);
          if (refund) {
            await this.notificationService.notify(
              refund.userId,
              'Hoàn tiền thành công',
              `Yêu cầu hoàn tiền cho đơn đặt chỗ #${refund.bookingId} đã hoàn tất.`,
            );
          }
        }
      } else if (refundObject.status === 'failed') {
        this.logger.error(
          `Stripe refund ${refundObject.id} (refund #${refundId}) failed`,
        );
        await this.paymentRepository.markRefundFailed(refundId);
      }
    }
  }

  /** V9 vong 2 — best-effort, khong duoc nem loi ra ngoai (cung triet ly voi
   * CommissionService.recordForPayment: loi o day khong duoc lam hong response webhook tra ve
   * cho Stripe). Booking Staff/Owner/Manager cua Provider deu chua co "inbox" rieng theo Role o
   * V9 vong 1 nen tam thoi notify thang userId dang ky Provider (mirror provider.service.ts). */
  private async notifyProviderOfNewBooking(payment: Payment) {
    try {
      const providerUserId = await this.commissionService.resolveProviderUserId(
        payment.bookingDomain,
        payment.bookingId,
      );
      if (!providerUserId) return;

      await this.notificationService.notify(
        providerUserId,
        'Booking mới',
        `Bạn có 1 đơn đặt chỗ mới #${payment.bookingId} vừa được thanh toán thành công.`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to notify Provider of new booking for payment ${payment.id}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }

  private extractPaymentId(
    metadata: Stripe.Metadata | null | undefined,
  ): bigint | null {
    return this.extractId(metadata, 'paymentId');
  }

  private extractId(
    metadata: Stripe.Metadata | null | undefined,
    key: string,
  ): bigint | null {
    const raw = metadata?.[key];
    if (!raw) return null;
    try {
      return BigInt(raw);
    } catch {
      return null;
    }
  }
}
