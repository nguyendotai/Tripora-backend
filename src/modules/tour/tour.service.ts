import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProviderType, TourStatus } from '@prisma/client';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { DestinationRepository } from '../destination/destination.repository';
import { NotificationService } from '../notification/notification.service';
import { OrganizationMemberService } from '../provider/organization-member.service';
import { ProviderRepository } from '../provider/provider.repository';
import { CacheService } from '../../redis/cache.service';
import {
  buildPaginated,
  clampLimit,
  resolvePagination,
} from '../../shared/utils/pagination';
import { slugify } from '../../shared/utils/slugify';
import { CreateTourDto } from './dto/create-tour.dto';
import { ListPopularToursDto } from './dto/list-popular-tours.dto';
import { ListToursDto } from './dto/list-tours.dto';
import { UpdateTourDto } from './dto/update-tour.dto';
import { TourRepository } from './tour.repository';

const POPULAR_CACHE_TTL_SECONDS = 300;

@Injectable()
export class TourService {
  constructor(
    private readonly tourRepository: TourRepository,
    private readonly providerRepository: ProviderRepository,
    private readonly organizationMemberService: OrganizationMemberService,
    private readonly destinationRepository: DestinationRepository,
    private readonly notificationService: NotificationService,
    private readonly cacheService: CacheService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  /** Public — chỉ Tour đã APPROVED. */
  async list(query: ListToursDto) {
    const { page, limit, skip, take } = resolvePagination(query);

    const where: Prisma.TourWhereInput = {
      deletedAt: null,
      status: TourStatus.APPROVED,
      ...(query.q && { title: { contains: query.q } }),
      ...(query.destinationId && {
        destinationId: BigInt(query.destinationId),
      }),
    };

    const orderBy: Prisma.TourOrderByWithRelationInput =
      query.sort === 'title_asc' ? { title: 'asc' } : { createdAt: 'desc' };

    const [items, totalItems] = await this.tourRepository.findMany(
      where,
      skip,
      take,
      orderBy,
    );
    return buildPaginated(items, totalItems, page, limit);
  }

  /** Public — Home page "Tour noi bat". Khong phan trang, chi tra top N. V9 vong 5 — cache-aside
   * 5 phut, khong invalidate chu dong. */
  async listPopular(query: ListPopularToursDto) {
    const limit = clampLimit(query.limit, 6, 12);
    const cacheKey = `popular:tours:${limit}`;

    const cached = await this.cacheService.get<unknown>(cacheKey);
    if (cached) return cached;

    const result = await this.tourRepository.findPopular(limit);
    await this.cacheService.set(cacheKey, result, POPULAR_CACHE_TTL_SECONDS);
    return result;
  }

  async getBySlug(slug: string) {
    const tour = await this.tourRepository.findBySlug(slug);
    if (!tour || tour.status !== TourStatus.APPROVED) {
      throw new NotFoundException('Tour not found');
    }
    return tour;
  }

  /** Tour Operator xem toàn bộ Tour của chính mình, bất kể status. */
  async listMine(userId: bigint, query: ListToursDto) {
    const provider = await this.getOwnedApprovedTourProvider(userId);
    const { page, limit, skip, take } = resolvePagination(query);

    const where: Prisma.TourWhereInput = {
      deletedAt: null,
      providerId: provider.id,
      ...(query.status && { status: query.status }),
    };

    const [items, totalItems] = await this.tourRepository.findMany(
      where,
      skip,
      take,
    );
    return buildPaginated(items, totalItems, page, limit);
  }

  /** Admin — xem toàn bộ Tour của mọi Provider, filter theo status. */
  async listForModeration(query: ListToursDto) {
    const { page, limit, skip, take } = resolvePagination(query);

    const where: Prisma.TourWhereInput = {
      deletedAt: null,
      ...(query.status && { status: query.status }),
    };

    const [items, totalItems] = await this.tourRepository.findMany(
      where,
      skip,
      take,
    );
    return buildPaginated(items, totalItems, page, limit);
  }

  async create(userId: bigint, dto: CreateTourDto) {
    const provider = await this.getOwnedApprovedTourProviderForManage(userId);

    if (dto.destinationId) {
      const destination = await this.destinationRepository.findById(
        BigInt(dto.destinationId),
      );
      if (!destination) {
        throw new BadRequestException(
          `Destination not found: ${dto.destinationId}`,
        );
      }
    }

    const slug = await this.generateUniqueSlug(dto.title);

    return this.tourRepository.create({
      title: dto.title,
      slug,
      description: dto.description,
      images: dto.images,
      durationLabel: dto.durationLabel,
      price: dto.price,
      maxParticipants: dto.maxParticipants,
      included: dto.included,
      excluded: dto.excluded,
      cancellationPolicy: dto.cancellationPolicy,
      provider: { connect: { id: provider.id } },
      ...(dto.destinationId && {
        destination: { connect: { id: BigInt(dto.destinationId) } },
      }),
    });
  }

  async update(userId: bigint, tourId: bigint, dto: UpdateTourDto) {
    const tour = await this.getOwnedTour(userId, tourId);

    if (dto.destinationId) {
      const destination = await this.destinationRepository.findById(
        BigInt(dto.destinationId),
      );
      if (!destination) {
        throw new BadRequestException(
          `Destination not found: ${dto.destinationId}`,
        );
      }
    }

    return this.tourRepository.update(tour.id, {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.images !== undefined && { images: dto.images }),
      ...(dto.durationLabel !== undefined && {
        durationLabel: dto.durationLabel,
      }),
      ...(dto.price !== undefined && { price: dto.price }),
      ...(dto.maxParticipants !== undefined && {
        maxParticipants: dto.maxParticipants,
      }),
      ...(dto.included !== undefined && { included: dto.included }),
      ...(dto.excluded !== undefined && { excluded: dto.excluded }),
      ...(dto.cancellationPolicy !== undefined && {
        cancellationPolicy: dto.cancellationPolicy,
      }),
      ...(dto.destinationId !== undefined && {
        destination: { connect: { id: BigInt(dto.destinationId) } },
      }),
    });
  }

  async remove(userId: bigint, tourId: bigint) {
    const tour = await this.getOwnedTour(userId, tourId);
    await this.tourRepository.softDelete(tour.id);
  }

  async review(
    actorId: bigint,
    actorRole: string,
    id: bigint,
    status: 'APPROVED' | 'REJECTED',
    reason?: string,
  ) {
    const tour = await this.tourRepository.findById(id);
    if (!tour) {
      throw new NotFoundException('Tour not found');
    }

    const updated = await this.tourRepository.updateStatus(id, status);

    const provider = await this.providerRepository.findById(tour.providerId);
    if (provider) {
      const rejectMessage = reason
        ? `Tour "${tour.title}" của bạn đã bị từ chối. Lý do: ${reason}`
        : `Tour "${tour.title}" của bạn đã bị từ chối. Vui lòng liên hệ quản trị viên để biết thêm chi tiết.`;

      await this.notificationService.notify(
        provider.userId,
        status === 'APPROVED' ? 'Tour đã được duyệt' : 'Tour bị từ chối',
        status === 'APPROVED'
          ? `Tour "${tour.title}" của bạn đã được duyệt và hiển thị công khai.`
          : rejectMessage,
      );
    }

    await this.activityLogService.log({
      actorId,
      actorRole,
      action: 'tour.review',
      entityType: 'tour',
      entityId: id,
      reason,
      metadata: { status },
    });

    return updated;
  }

  /** Chỉ Provider type=TOUR đã APPROVED mới quản lý Tour — tách domain với Hotel Provider. */
  private async getOwnedApprovedTourProvider(userId: bigint) {
    const { provider } = await this.organizationMemberService.requireMembership(
      userId,
      {
        providerType: ProviderType.TOUR,
      },
    );
    return provider;
  }

  private async getOwnedApprovedTourProviderForManage(userId: bigint) {
    const { provider } = await this.organizationMemberService.requireMembership(
      userId,
      {
        providerType: ProviderType.TOUR,
        permission: 'tour:manage',
      },
    );
    return provider;
  }

  private async getOwnedTour(userId: bigint, tourId: bigint) {
    const provider = await this.getOwnedApprovedTourProviderForManage(userId);
    const tour = await this.tourRepository.findById(tourId);
    if (!tour) {
      throw new NotFoundException('Tour not found');
    }
    if (tour.providerId !== provider.id) {
      throw new ForbiddenException('You do not own this tour');
    }
    return tour;
  }

  private async generateUniqueSlug(title: string): Promise<string> {
    const base = slugify(title);
    let candidate = base;
    let suffix = 2;

    while (await this.tourRepository.findBySlugExact(candidate)) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }
}
