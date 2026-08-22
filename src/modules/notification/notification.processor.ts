import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { RealtimeService } from '../realtime/realtime.service';
import { NotificationRepository } from './notification.repository';

export interface NotifyJobData {
  userId: string;
  title: string;
  message: string;
}

/** V9 vong 5 — worker chay in-process (cung process API, dung quy mo 1 instance hien tai, mirror
 * ly do da dung de hoan Redis Adapter cho Socket.IO o vong 1). Khong bat try/catch quanh viec ghi
 * DB/emit — de loi throw tu nhien di dung co che retry/backoff cua BullMQ (queue.add da cau hinh
 * o NotificationService), tot hon hanh vi dong bo cu (khong co retry). */
@Processor('notification')
export class NotificationProcessor extends WorkerHost {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly realtimeService: RealtimeService,
  ) {
    super();
  }

  async process(job: Job<NotifyJobData>) {
    const { userId, title, message } = job.data;
    const notification = await this.notificationRepository.create({
      userId: BigInt(userId),
      title,
      message,
    });
    this.realtimeService.emitToUser(BigInt(userId), 'notification:new', notification);
  }
}
