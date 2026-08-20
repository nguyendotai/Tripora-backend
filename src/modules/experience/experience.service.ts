import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ExperienceStatus, Prisma, ProviderType } from '@prisma/client';
import { DestinationRepository } from '../destination/destination.repository';
import { NotificationService } from '../notification/notification.service';
import { OrganizationMemberService } from '../provider/organization-member.service';
import { ProviderRepository } from '../provider/provider.repository';
import {
  buildPaginated,
  clampLimit,
  resolvePagination,
} from '../../shared/utils/pagination';
import { slugify } from '../../shared/utils/slugify';
import { CreateExperienceDto } from './dto/create-experience.dto';
import { ListExperiencesDto } from './dto/list-experiences.dto';
import { ListPopularExperiencesDto } from './dto/list-popular-experiences.dto';
import { UpdateExperienceDto } from './dto/update-experience.dto';
import { ExperienceRepository } from './experience.repository';

@Injectable()
export class ExperienceService {
  constructor(
    private readonly experienceRepository: ExperienceRepository,
    private readonly providerRepository: ProviderRepository,
    private readonly organizationMemberService: OrganizationMemberService,
    private readonly destinationRepository: DestinationRepository,
    private readonly notificationService: NotificationService,
  ) {}

  /** Public — chỉ Experience đã APPROVED. */
  async list(query: ListExperiencesDto) {
    const { page, limit, skip, take } = resolvePagination(query);

    const where: Prisma.ExperienceWhereInput = {
      deletedAt: null,
      status: ExperienceStatus.APPROVED,
      ...(query.q && { title: { contains: query.q } }),
      ...(query.destinationId && {
        destinationId: BigInt(query.destinationId),
      }),
    };

    const orderBy: Prisma.ExperienceOrderByWithRelationInput =
      query.sort === 'title_asc' ? { title: 'asc' } : { createdAt: 'desc' };

    const [items, totalItems] = await this.experienceRepository.findMany(
      where,
      skip,
      take,
      orderBy,
    );
    return buildPaginated(items, totalItems, page, limit);
  }

  /** Public — Home page "Hoat dong noi bat". Khong phan trang, chi tra top N. */
  async listPopular(query: ListPopularExperiencesDto) {
    const limit = clampLimit(query.limit, 6, 12);
    return this.experienceRepository.findPopular(limit);
  }

  async getBySlug(slug: string) {
    const experience = await this.experienceRepository.findBySlug(slug);
    if (!experience || experience.status !== ExperienceStatus.APPROVED) {
      throw new NotFoundException('Experience not found');
    }
    return experience;
  }

  /** Experience Operator xem toàn bộ Experience của chính mình, bất kể status. */
  async listMine(userId: bigint, query: ListExperiencesDto) {
    const provider = await this.getOwnedApprovedExperienceProvider(userId);
    const { page, limit, skip, take } = resolvePagination(query);

    const where: Prisma.ExperienceWhereInput = {
      deletedAt: null,
      providerId: provider.id,
      ...(query.status && { status: query.status }),
    };

    const [items, totalItems] = await this.experienceRepository.findMany(
      where,
      skip,
      take,
    );
    return buildPaginated(items, totalItems, page, limit);
  }

  /** Admin — xem toàn bộ Experience của mọi Provider, filter theo status. */
  async listForModeration(query: ListExperiencesDto) {
    const { page, limit, skip, take } = resolvePagination(query);

    const where: Prisma.ExperienceWhereInput = {
      deletedAt: null,
      ...(query.status && { status: query.status }),
    };

    const [items, totalItems] = await this.experienceRepository.findMany(
      where,
      skip,
      take,
    );
    return buildPaginated(items, totalItems, page, limit);
  }

  async create(userId: bigint, dto: CreateExperienceDto) {
    const provider =
      await this.getOwnedApprovedExperienceProviderForManage(userId);

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

    return this.experienceRepository.create({
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

  async update(userId: bigint, experienceId: bigint, dto: UpdateExperienceDto) {
    const experience = await this.getOwnedExperience(userId, experienceId);

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

    return this.experienceRepository.update(experience.id, {
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

  async remove(userId: bigint, experienceId: bigint) {
    const experience = await this.getOwnedExperience(userId, experienceId);
    await this.experienceRepository.softDelete(experience.id);
  }

  async review(id: bigint, status: 'APPROVED' | 'REJECTED', reason?: string) {
    const experience = await this.experienceRepository.findById(id);
    if (!experience) {
      throw new NotFoundException('Experience not found');
    }

    const updated = await this.experienceRepository.updateStatus(id, status);

    const provider = await this.providerRepository.findById(
      experience.providerId,
    );
    if (provider) {
      const rejectMessage = reason
        ? `Experience "${experience.title}" của bạn đã bị từ chối. Lý do: ${reason}`
        : `Experience "${experience.title}" của bạn đã bị từ chối. Vui lòng liên hệ quản trị viên để biết thêm chi tiết.`;

      await this.notificationService.notify(
        provider.userId,
        status === 'APPROVED'
          ? 'Experience đã được duyệt'
          : 'Experience bị từ chối',
        status === 'APPROVED'
          ? `Experience "${experience.title}" của bạn đã được duyệt và hiển thị công khai.`
          : rejectMessage,
      );
    }

    return updated;
  }

  /** Chỉ Provider type=ACTIVITY đã APPROVED mới quản lý Experience — tách domain với Hotel/Tour. */
  private async getOwnedApprovedExperienceProvider(userId: bigint) {
    const { provider } = await this.organizationMemberService.requireMembership(
      userId,
      {
        providerType: ProviderType.ACTIVITY,
      },
    );
    return provider;
  }

  private async getOwnedApprovedExperienceProviderForManage(userId: bigint) {
    const { provider } = await this.organizationMemberService.requireMembership(
      userId,
      {
        providerType: ProviderType.ACTIVITY,
        permission: 'experience:manage',
      },
    );
    return provider;
  }

  private async getOwnedExperience(userId: bigint, experienceId: bigint) {
    const provider =
      await this.getOwnedApprovedExperienceProviderForManage(userId);
    const experience = await this.experienceRepository.findById(experienceId);
    if (!experience) {
      throw new NotFoundException('Experience not found');
    }
    if (experience.providerId !== provider.id) {
      throw new ForbiddenException('You do not own this experience');
    }
    return experience;
  }

  private async generateUniqueSlug(title: string): Promise<string> {
    const base = slugify(title);
    let candidate = base;
    let suffix = 2;

    while (await this.experienceRepository.findBySlugExact(candidate)) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }
}
