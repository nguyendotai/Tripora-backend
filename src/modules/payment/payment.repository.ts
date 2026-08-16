import { Injectable } from '@nestjs/common';
import { BookingDomain, Payment, Prisma } from '@prisma/client';
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
  async markSuccessAndConfirmBooking(paymentId: bigint): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: paymentId } });
      if (!payment || payment.status !== 'PENDING') {
        return false;
      }

      await tx.payment.update({
        where: { id: paymentId },
        data: { status: 'SUCCESS', paidAt: new Date() },
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
}
