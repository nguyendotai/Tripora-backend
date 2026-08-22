import { InjectQueue } from '@nestjs/bullmq';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { buildPaginated, resolvePagination } from '../../shared/utils/pagination';
import { ListNotificationsDto } from './dto/list-notifications.dto';
import { NotificationRepository } from './notification.repository';
import type { NotifyJobData } from './notification.processor';

@Injectable()
export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    @InjectQueue('notification') private readonly notificationQueue: Queue<NotifyJobData>,
  ) {}

  async list(userId: bigint, query: ListNotificationsDto) {
    const { page, limit, skip, take } = resolvePagination(query);
    const [items, totalItems] = await this.notificationRepository.findMany(userId, skip, take);
    const unreadCount = await this.notificationRepository.countUnread(userId);
    return { ...buildPaginated(items, totalItems, page, limit), unreadCount };
  }

  async markAsRead(userId: bigint, id: bigint) {
    const notification = await this.notificationRepository.findById(id);
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    if (notification.userId !== userId) {
      throw new ForbiddenException('You do not own this notification');
    }
    return this.notificationRepository.markAsRead(id);
  }

  async markAllAsRead(userId: bigint) {
    await this.notificationRepository.markAllAsRead(userId);
  }

  /** Internal helper for other modules to notify a user — not exposed via HTTP. V9 vong 1: gui
   * kem qua Socket.IO (phong "user:<id>") — day la diem chot duy nhat can sua de toan bo noi
   * dang goi notify() (19 module) tu dong thanh realtime, khong dung truc tiep tung noi goi.
   * V9 vong 5: chuyen sang enqueue BullMQ (khong ghi DB/emit truc tiep nua) — NotificationProcessor
   * moi lam viec that. Khong doi signature/hanh vi voi 19 call site (khong noi nao dung gia tri
   * tra ve, da grep xac nhan truoc khi doi). userId (bigint) phai serialize thanh string vi BullMQ
   * luu job data qua JSON. */
  async notify(userId: bigint, title: string, message: string) {
    await this.notificationQueue.add(
      'notify',
      { userId: userId.toString(), title, message },
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    );
  }
}
