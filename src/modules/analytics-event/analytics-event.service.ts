import { Injectable, Logger } from '@nestjs/common';
import { AnalyticsEventRepository } from './analytics-event.repository';
import { CreateAnalyticsEventDto } from './dto/create-analytics-event.dto';

@Injectable()
export class AnalyticsEventService {
  private readonly logger = new Logger(AnalyticsEventService.name);

  constructor(private readonly analyticsEventRepository: AnalyticsEventRepository) {}

  /** Best-effort — khong duoc nem loi ra ngoai, khach an danh (userId khong co) cung ghi duoc.
   * Cung triet ly voi NotificationService/PaymentService.notifyProviderOfNewBooking: 1 loi ghi
   * log phan tich khong duoc lam hong trai nghiem nguoi dung. */
  async track(dto: CreateAnalyticsEventDto) {
    try {
      await this.analyticsEventRepository.create({
        type: dto.type,
        userId: dto.userId ? BigInt(dto.userId) : undefined,
        entityType: dto.entityType,
        entityId: dto.entityId ? BigInt(dto.entityId) : undefined,
        query: dto.query,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to record analytics event (${dto.type})`,
        error instanceof Error ? error.stack : error,
      );
    }
  }
}
