import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export interface CreateActivityLogParams {
  actorId: bigint;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: bigint;
  reason?: string;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class ActivityLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateActivityLogParams) {
    return this.prisma.activityLog.create({ data });
  }

  async findMany(
    where: Prisma.ActivityLogWhereInput,
    skip: number,
    take: number,
  ) {
    const [items, totalItems] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.activityLog.count({ where }),
    ]);
    return [items, totalItems] as const;
  }
}
