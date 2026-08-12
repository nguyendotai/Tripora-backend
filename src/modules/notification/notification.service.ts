import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { buildPaginated, resolvePagination } from '../../shared/utils/pagination';
import { ListNotificationsDto } from './dto/list-notifications.dto';
import { NotificationRepository } from './notification.repository';

@Injectable()
export class NotificationService {
  constructor(private readonly notificationRepository: NotificationRepository) {}

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

  /** Internal helper for other modules to notify a user — not exposed via HTTP. */
  async notify(userId: bigint, title: string, message: string) {
    await this.notificationRepository.create({ userId, title, message });
  }
}
