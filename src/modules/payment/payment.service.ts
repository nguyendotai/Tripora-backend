import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { BookingDomain, Prisma } from '@prisma/client';
import Stripe from 'stripe';
import { NotificationService } from '../notification/notification.service';
import { PaymentGatewayService } from './payment-gateway.service';
import { PaymentRepository } from './payment.repository';

export interface CreatePaymentForBookingParams {
  userId: bigint;
  bookingDomain: BookingDomain;
  bookingId: bigint;
  amount: Prisma.Decimal;
  currency: string;
  description: string;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly paymentGateway: PaymentGatewayService,
    private readonly notificationService: NotificationService,
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
    await this.paymentRepository.setTransactionId(payment.id, session.sessionId);

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
      throw new InternalServerErrorException('Payment gateway is temporarily unavailable. Please try again shortly.');
    }
    await this.paymentRepository.resetForRetry(payment.id, session.sessionId);

    return { checkoutUrl: session.url };
  }

  /** Endpoint duy nhat duoc phep doi status Payment/Booking — verify chu ky truoc, cam nhan
   * truc tiep tu Frontend redirect (backend/CLAUDE.md muc 3). */
  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const event = this.paymentGateway.constructEvent(rawBody, signature);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const paymentId = this.extractPaymentId(session.metadata);
      if (paymentId === null) return;

      const applied = await this.paymentRepository.markSuccessAndConfirmBooking(paymentId);
      if (applied) {
        const payment = await this.paymentRepository.findById(paymentId);
        if (payment) {
          await this.notificationService.notify(
            payment.userId,
            'Thanh toán thành công',
            `Đơn đặt chỗ #${payment.bookingId} của bạn đã được xác nhận sau khi thanh toán thành công.`,
          );
        }
      }
      return;
    }

    if (event.type === 'checkout.session.expired') {
      const session = event.data.object as Stripe.Checkout.Session;
      const paymentId = this.extractPaymentId(session.metadata);
      if (paymentId !== null) {
        await this.paymentRepository.markFailed(paymentId);
      }
      return;
    }

    if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object as Stripe.PaymentIntent;
      const paymentId = this.extractPaymentId(intent.metadata);
      if (paymentId !== null) {
        await this.paymentRepository.markFailed(paymentId);
      }
    }
  }

  private extractPaymentId(metadata: Stripe.Metadata | null | undefined): bigint | null {
    const raw = metadata?.paymentId;
    if (!raw) return null;
    try {
      return BigInt(raw);
    } catch {
      return null;
    }
  }
}
