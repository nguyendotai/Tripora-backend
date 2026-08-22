import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  buildPaginated,
  resolvePagination,
} from '../../shared/utils/pagination';
import {
  ActivityLogRepository,
  CreateActivityLogParams,
} from './activity-log.repository';
import { ListActivityLogsDto } from './dto/list-activity-logs.dto';

@Injectable()
export class ActivityLogService {
  private readonly logger = new Logger(ActivityLogService.name);

  constructor(
    private readonly activityLogRepository: ActivityLogRepository,
    private readonly prisma: PrismaService,
  ) {}

  /** Best-effort — 1 loi ghi audit khong duoc chan action chinh da thanh cong.
   * Cung triet ly voi NotificationService/AnalyticsEventService. */
  async log(params: CreateActivityLogParams) {
    try {
      await this.activityLogRepository.create(params);
    } catch (error) {
      this.logger.warn(
        `Failed to record activity log (${params.action})`,
        error instanceof Error ? error.stack : error,
      );
    }
  }

  async list(query: ListActivityLogsDto) {
    const { page, limit, skip, take } = resolvePagination(query);

    const where: Prisma.ActivityLogWhereInput = {
      ...(query.entityType && { entityType: query.entityType }),
      ...(query.actorId && { actorId: BigInt(query.actorId) }),
    };

    const [items, totalItems] = await this.activityLogRepository.findMany(
      where,
      skip,
      take,
    );

    // Khong co Prisma relation toi User (polymorphic actor) nen tu gop, mirror
    // ReportRepository.topDestinationsByWishlist: gom distinct actorId -> 1 query -> Map re-join.
    const actorIds = [
      ...new Set(items.map((item) => item.actorId.toString())),
    ].map(BigInt);
    const actors = actorIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, firstName: true, lastName: true, email: true },
        })
      : [];
    const actorById = new Map(
      actors.map((actor) => [actor.id.toString(), actor]),
    );

    const enriched = items.map((item) => ({
      ...item,
      actor: actorById.get(item.actorId.toString()) ?? null,
    }));

    return buildPaginated(enriched, totalItems, page, limit);
  }
}
