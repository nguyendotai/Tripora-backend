import { Injectable } from '@nestjs/common';
import { AnalyticsEventType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export interface CreateAnalyticsEventParams {
  type: AnalyticsEventType;
  userId?: bigint;
  entityType?: string;
  entityId?: bigint;
  query?: string;
}

@Injectable()
export class AnalyticsEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateAnalyticsEventParams) {
    return this.prisma.analyticsEvent.create({ data });
  }
}
