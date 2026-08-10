import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentStatus, RefundStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ActivityLogService } from '../activity/activity-log.service';
import { AuthenticatedUser } from '../../common/guards/jwt-auth.guard';
import { CompleteRefundDto, RefundCompletionStatus } from './dto/complete-refund.dto';

@Injectable()
export class RefundService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
  ) {}

  /**
   * Xác nhận kết quả hoàn tiền từ Payment Gateway — placeholder Admin thao tác thủ công
   * cho tới khi tích hợp Gateway thật gọi qua Webhook (xem refund.md mục 3, 5).
   */
  async complete(id: bigint, dto: CompleteRefundDto, user: AuthenticatedUser) {
    const refund = await this.prisma.refund.findUnique({
      where: { id },
      select: { id: true, bookingId: true, status: true },
    });
    if (!refund) {
      throw new NotFoundException('Refund not found');
    }
    if (refund.status !== RefundStatus.PROCESSING) {
      throw new BadRequestException('Refund is not in PROCESSING status');
    }

    const isCompleted = dto.status === RefundCompletionStatus.COMPLETED;
    const newStatus = isCompleted ? RefundStatus.COMPLETED : RefundStatus.FAILED;

    await this.prisma.$transaction(async (tx) => {
      await tx.refund.update({ where: { id }, data: { status: newStatus } });

      if (isCompleted) {
        await tx.booking.update({
          where: { id: refund.bookingId },
          data: { paymentStatus: PaymentStatus.REFUNDED },
        });

        const booking = await tx.booking.findUnique({
          where: { id: refund.bookingId },
          select: { userId: true },
        });
        if (booking) {
          await tx.notification.create({
            data: {
              userId: booking.userId,
              type: 'REFUND_COMPLETED',
              title: 'Hoàn tiền thành công',
              message: 'Yêu cầu hoàn tiền của bạn đã được xử lý xong.',
            },
          });
        }
      }
    });

    await this.activityLog.log({
      actorId: BigInt(user.id),
      action: isCompleted ? 'refund.completed' : 'refund.failed',
      resourceType: 'REFUND',
      resourceId: id,
    });

    return this.prisma.refund.findUnique({ where: { id } });
  }
}
