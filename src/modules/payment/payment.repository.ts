import { Injectable } from '@nestjs/common';
import { BookingDomain, Payment, Prisma, Refund } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export interface CreatePaymentParams {
  userId: bigint;
  bookingDomain: BookingDomain;
  bookingId: bigint;
  amount: Prisma.Decimal;
  discountAmount?: Prisma.Decimal;
  currency: string;
}

/** BookingDomain -> ten bang MySQL that — chi dung de flip status generic (khong dong cham
 * inventory/field rieng cua tung domain), gia tri luon lay tu enum cua chinh minh (khong bao gio
 * tu input nguoi dung) nen an toan khi dua vao $executeRawUnsafe cho ten bang. */
const DOMAIN_TABLE: Record<BookingDomain, string> = {
  HOTEL: 'hotel_bookings',
  TOUR: 'tour_bookings',
  EXPERIENCE: 'experience_bookings',
  TRANSPORT: 'transport_bookings',
  FLIGHT: 'flight_bookings',
};

@Injectable()
export class PaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(params: CreatePaymentParams): Promise<Payment> {
    return this.prisma.payment.create({
      data: {
        userId: params.userId,
        bookingDomain: params.bookingDomain,
        bookingId: params.bookingId,
        amount: params.amount,
        discountAmount: params.discountAmount ?? 0,
        currency: params.currency,
      },
    });
  }

  findById(id: bigint): Promise<Payment | null> {
    return this.prisma.payment.findUnique({ where: { id } });
  }

  /** Dung luc huy Booking — moi Booking chi co dung 1 Payment (retry cap nhat lai cung 1 dong,
   * khong tao Payment moi), nen tim theo status SUCCESS la tim dung Payment da thanh toan. */
  findSuccessfulPaymentByBooking(
    bookingDomain: BookingDomain,
    bookingId: bigint,
  ): Promise<Payment | null> {
    return this.prisma.payment.findFirst({
      where: { bookingDomain, bookingId, status: 'SUCCESS' },
    });
  }

  setTransactionId(id: bigint, transactionId: string): Promise<Payment> {
    return this.prisma.payment.update({
      where: { id },
      data: { transactionId },
    });
  }

  /** Dung khi retry — tao lai Checkout Session moi cho dung Payment do, dua status ve PENDING. */
  resetForRetry(id: bigint, transactionId: string): Promise<Payment> {
    return this.prisma.payment.update({
      where: { id },
      data: { status: 'PENDING', transactionId },
    });
  }

  /**
   * Webhook checkout.session.completed — idempotent (kiem tra status hien tai truoc khi doi, vi
   * Stripe co the gui trung webhook). Flip Payment -> SUCCESS, flip dung bang Booking (theo
   * bookingDomain) -> CONFIRMED (khong dong toi inventory — da tru luc tao Booking roi), sinh
   * Invoice — tat ca trong 1 transaction.
   */
  async markSuccessAndConfirmBooking(
    paymentId: bigint,
    paymentIntentId?: string,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: paymentId } });
      if (!payment || payment.status !== 'PENDING') {
        return false;
      }

      await tx.payment.update({
        where: { id: paymentId },
        data: { status: 'SUCCESS', paidAt: new Date(), paymentIntentId },
      });

      const table = DOMAIN_TABLE[payment.bookingDomain];
      await tx.$executeRawUnsafe(
        `UPDATE ${table} SET status = 'CONFIRMED', updated_at = NOW() WHERE id = ? AND status = 'PENDING_PAYMENT'`,
        payment.bookingId,
      );

      await tx.invoice.create({
        data: {
          userId: payment.userId,
          paymentId: payment.id,
          bookingDomain: payment.bookingDomain,
          bookingId: payment.bookingId,
          invoiceNumber: `INV-${Date.now()}-${payment.id}`,
          subtotal: payment.amount.add(payment.discountAmount),
          discount: payment.discountAmount,
          total: payment.amount,
          currency: payment.currency,
        },
      });

      return true;
    });
  }

  /** Webhook checkout.session.expired / payment_intent.payment_failed — Booking giu nguyen
   * PENDING_PAYMENT, khach con the retry trong han. Idempotent qua updateMany + status guard. */
  async markFailed(paymentId: bigint): Promise<void> {
    await this.prisma.payment.updateMany({
      where: { id: paymentId, status: 'PENDING' },
      data: { status: 'FAILED' },
    });
  }

  /** Dung boi BookingExpirationService — khi 1 Booking bi cron danh EXPIRED, Payment (PENDING)
   * dang tro toi Booking do cung phai FAILED theo, tranh 1 Payment con song tro ve Booking da
   * het han (neu khong, webhook thanh cong tre se khong flip duoc Booking vi status guard da
   * khong con PENDING_PAYMENT, nhung Payment se ket thuc sai o SUCCESS). */
  async markFailedForExpiredBookings(
    bookingDomain: BookingDomain,
    bookingIds: bigint[],
  ): Promise<void> {
    if (bookingIds.length === 0) return;
    await this.prisma.payment.updateMany({
      where: {
        bookingDomain,
        bookingId: { in: bookingIds },
        status: 'PENDING',
      },
      data: { status: 'FAILED' },
    });
  }

  /**
   * Chi goi SAU KHI cancelBooking() cua domain da chuyen Booking -> CANCELLED thanh cong.
   * amount=0 (ngoai moc hoan tien): tao Refund SUCCESS ngay, khong dong gi den Booking (giu
   * nguyen CANCELLED). amount>0: tao Refund PENDING + flip Booking CANCELLED -> REFUND_PENDING
   * trong cung 1 transaction, cho webhook refund.updated xac nhan that.
   */
  async createRefundRecord(params: {
    paymentId: bigint;
    userId: bigint;
    bookingDomain: BookingDomain;
    bookingId: bigint;
    amount: Prisma.Decimal;
    percent: number;
    reason?: string;
  }): Promise<Refund> {
    return this.prisma.$transaction(async (tx) => {
      const hasRefund = params.amount.gt(0);
      const refund = await tx.refund.create({
        data: {
          paymentId: params.paymentId,
          userId: params.userId,
          bookingDomain: params.bookingDomain,
          bookingId: params.bookingId,
          amount: params.amount,
          percent: params.percent,
          reason: params.reason,
          status: hasRefund ? 'PENDING' : 'SUCCESS',
          processedAt: hasRefund ? null : new Date(),
        },
      });

      if (hasRefund) {
        const table = DOMAIN_TABLE[params.bookingDomain];
        await tx.$executeRawUnsafe(
          `UPDATE ${table} SET status = 'REFUND_PENDING', updated_at = NOW() WHERE id = ? AND status = 'CANCELLED'`,
          params.bookingId,
        );
      }

      return refund;
    });
  }

  setStripeRefundId(id: bigint, stripeRefundId: string): Promise<Refund> {
    return this.prisma.refund.update({
      where: { id },
      data: { stripeRefundId },
    });
  }

  /** Webhook refund.updated (status succeeded) — idempotent qua status guard. Flip Refund ->
   * SUCCESS + Booking REFUND_PENDING -> REFUNDED trong 1 transaction. */
  async markRefundSuccess(refundId: bigint): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const refund = await tx.refund.findUnique({ where: { id: refundId } });
      if (!refund || refund.status !== 'PENDING') {
        return false;
      }

      await tx.refund.update({
        where: { id: refundId },
        data: { status: 'SUCCESS', processedAt: new Date() },
      });

      const table = DOMAIN_TABLE[refund.bookingDomain];
      await tx.$executeRawUnsafe(
        `UPDATE ${table} SET status = 'REFUNDED', updated_at = NOW() WHERE id = ? AND status = 'REFUND_PENDING'`,
        refund.bookingId,
      );
      return true;
    });
  }

  /** Webhook refund.updated (status failed) — Booking giu nguyen REFUND_PENDING, can xu ly thu
   * cong (khong co UI Admin retry-refund vong nay, gioi han biet truoc). */
  async markRefundFailed(refundId: bigint): Promise<void> {
    await this.prisma.refund.updateMany({
      where: { id: refundId, status: 'PENDING' },
      data: { status: 'FAILED' },
    });
  }

  findRefundById(id: bigint): Promise<Refund | null> {
    return this.prisma.refund.findUnique({ where: { id } });
  }

  /** Transaction history theo User — kem Invoice/Refund long theo neu co, moi nhat truoc. */
  async findManyByUser(
    userId: bigint,
    skip: number,
    take: number,
  ): Promise<
    [
      Prisma.PaymentGetPayload<{ include: { invoice: true; refund: true } }>[],
      number,
    ]
  > {
    return this.prisma.$transaction([
      this.prisma.payment.findMany({
        where: { userId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { invoice: true, refund: true },
      }),
      this.prisma.payment.count({ where: { userId } }),
    ]);
  }
}
