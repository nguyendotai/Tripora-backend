import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BookingService } from './booking.service';

/** Thời gian giữ chỗ tối đa trước khi tự động hủy (booking.md mục 3) — đồng bộ ý định với Redis
 * Reservation Lock TTL 900s (15 phút) dù Redis chưa wiring thật trong dự án này. */
const BOOKING_HOLD_MINUTES = 15;

@Injectable()
export class BookingSchedulerService {
  private readonly logger = new Logger(BookingSchedulerService.name);

  constructor(private readonly bookingService: BookingService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleExpiredBookings() {
    const count = await this.bookingService.cancelExpiredBookings(BOOKING_HOLD_MINUTES);
    if (count > 0) {
      this.logger.log(
        `Auto-cancelled ${count} expired booking(s) held past ${BOOKING_HOLD_MINUTES} minutes`,
      );
    }
  }
}
