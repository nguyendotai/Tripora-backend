import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export interface LogActivityInput {
  actorId?: bigint | null;
  action: string;
  resourceType: string;
  resourceId?: bigint | null;
  metadata?: Record<string, unknown>;
}

/**
 * Điểm ghi log duy nhất cho toàn hệ thống — mọi module gọi qua đây thay vì
 * tự ghi rời rạc, đảm bảo format action/resourceType nhất quán (activity-log.md mục 3).
 */
@Injectable()
export class ActivityLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: LogActivityInput): Promise<void> {
    await this.prisma.activityLog.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }
}
