import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BookingStatus, PaymentStatus, TxPaymentStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ActivityLogService } from '../activity/activity-log.service';
import { RoomAvailabilityService } from '../room-availability/room-availability.service';
import { verifyWebhookSignature } from '../../shared/utils/webhook-signature';
import { PaymentWebhookDto, WebhookPaymentStatus } from './dto/payment-webhook.dto';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
    private readonly roomAvailability: RoomAvailabilityService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Webhook Payment Gateway (placeholder — chưa tích hợp Gateway thật, xem
   * shared/utils/webhook-signature.ts). Idempotent theo transactionId.
   */
  async handleWebhook(dto: PaymentWebhookDto) {
    const secret = this.config.get<string>('PAYMENT_WEBHOOK_SECRET', '');
    const payload = `${dto.bookingId}.${dto.transactionId}.${dto.amount}.${dto.status}`;
    if (!secret || !verifyWebhookSignature(payload, dto.signature, secret)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const bookingId = BigInt(dto.bookingId);

    const alreadyProcessed = await this.prisma.payment.findFirst({
      where: {
        bookingId,
        transactionId: dto.transactionId,
        status: { not: TxPaymentStatus.PENDING },
      },
      select: { id: true },
    });
    if (alreadyProcessed) {
      return { success: true, message: 'Already processed' };
    }

    const pendingPayment = await this.prisma.payment.findFirst({
      where: { bookingId, status: TxPaymentStatus.PENDING },
      select: { id: true, amount: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!pendingPayment) {
      throw new BadRequestException('No pending payment found for this booking');
    }
    if (Number(pendingPayment.amount) !== dto.amount) {
      throw new BadRequestException('Webhook amount does not match the pending payment amount');
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        userId: true,
        status: true,
        items: { select: { resourceId: true, date: true, quantity: true } },
      },
    });
    if (!booking) {
      throw new BadRequestException('Booking not found');
    }
    if (
      booking.status !== BookingStatus.PENDING &&
      booking.status !== BookingStatus.PAYMENT_PENDING
    ) {
      // Booking đã bị hủy thủ công (hoặc xử lý bởi webhook khác) trước khi Gateway phản hồi —
      // Payment vẫn còn PENDING (không có luồng đổi trạng thái khi hủy Booking chưa thanh toán),
      // nên chặn ở đây để tránh 1 webhook trễ làm CONFIRMED nhầm 1 Booking đã CANCELLED
      // (đã hoàn tồn kho rồi, confirm lại sẽ không trừ lại tồn kho -> sai lệch dữ liệu).
      throw new BadRequestException('Booking is not awaiting payment');
    }

    if (dto.status === WebhookPaymentStatus.SUCCESS) {
      await this.prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: pendingPayment.id },
          data: {
            transactionId: dto.transactionId,
            provider: dto.provider,
            status: TxPaymentStatus.SUCCESS,
            paidAt: new Date(),
          },
        });
        await tx.booking.update({
          where: { id: bookingId },
          data: { status: BookingStatus.CONFIRMED, paymentStatus: PaymentStatus.PAID },
        });
        await tx.notification.create({
          data: {
            userId: booking.userId,
            type: 'BOOKING_CONFIRMED',
            title: 'Đặt phòng đã được xác nhận',
            message: `Booking của bạn đã thanh toán thành công.`,
          },
        });
      });

      await this.activityLog.log({
        action: 'payment.succeeded',
        resourceType: 'PAYMENT',
        resourceId: pendingPayment.id,
      });
      await this.activityLog.log({
        action: 'booking.confirmed',
        resourceType: 'BOOKING',
        resourceId: bookingId,
      });
    } else {
      await this.prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: pendingPayment.id },
          data: {
            transactionId: dto.transactionId,
            provider: dto.provider,
            status: TxPaymentStatus.FAILED,
          },
        });

        for (const item of booking.items) {
          if (item.date) {
            await this.roomAvailability.incrementAvailability(
              tx,
              item.resourceId,
              item.date,
              item.quantity,
            );
          }
        }

        await tx.booking.update({
          where: { id: bookingId },
          data: { status: BookingStatus.CANCELLED },
        });

        await tx.notification.create({
          data: {
            userId: booking.userId,
            type: 'PAYMENT_FAILED',
            title: 'Thanh toán thất bại',
            message: 'Booking đã bị hủy do thanh toán không thành công.',
          },
        });
      });

      await this.activityLog.log({
        action: 'payment.failed',
        resourceType: 'PAYMENT',
        resourceId: pendingPayment.id,
      });
    }

    return { success: true };
  }
}
