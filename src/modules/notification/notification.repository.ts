import { Injectable } from '@nestjs/common';
import { Notification, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    userId: bigint,
    skip: number,
    take: number,
  ): Promise<[Notification[], number]> {
    const where: Prisma.NotificationWhereInput = { userId };
    return this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);
  }

  countUnread(userId: bigint): Promise<number> {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  findById(id: bigint): Promise<Notification | null> {
    return this.prisma.notification.findUnique({ where: { id } });
  }

  create(data: { userId: bigint; title: string; message: string }): Promise<Notification> {
    return this.prisma.notification.create({
      data: {
        title: data.title,
        message: data.message,
        user: { connect: { id: data.userId } },
      },
    });
  }

  markAsRead(id: bigint): Promise<Notification> {
    return this.prisma.notification.update({ where: { id }, data: { isRead: true } });
  }

  markAllAsRead(userId: bigint): Promise<Prisma.BatchPayload> {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}
