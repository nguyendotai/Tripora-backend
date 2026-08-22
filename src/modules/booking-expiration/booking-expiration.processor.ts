import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { OnModuleInit } from '@nestjs/common';
import type { Job, Queue } from 'bullmq';
import { BookingExpirationService } from './booking-expiration.service';

const REPEAT_EVERY_MS = 5 * 60 * 1000;
const REPEATABLE_JOB_ID = 'booking-expiration-repeat';

/** V9 vong 5 — migrate tu @Cron(EVERY_5_MINUTES) sang BullMQ repeatable job. `upsertJobScheduler`
 * (API repeatable job hien tai cua BullMQ — `repeat` truc tiep trong `queue.add()` da deprecated)
 * tu idempotent theo `jobSchedulerId` co dinh, khong tao trung lap moi lan server restart. Worker
 * chay in-process, dung quy mo 1 instance hien tai. */
@Processor('booking-expiration')
export class BookingExpirationProcessor extends WorkerHost implements OnModuleInit {
  constructor(
    private readonly bookingExpirationService: BookingExpirationService,
    @InjectQueue('booking-expiration') private readonly queue: Queue,
  ) {
    super();
  }

  async onModuleInit() {
    await this.queue.upsertJobScheduler(
      REPEATABLE_JOB_ID,
      { every: REPEAT_EVERY_MS },
      { name: 'expire', opts: { removeOnComplete: 20, removeOnFail: 20 } },
    );
  }

  async process(_job: Job) {
    await this.bookingExpirationService.expirePendingBookings();
  }
}
