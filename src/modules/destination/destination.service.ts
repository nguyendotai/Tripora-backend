import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ActivityLogService } from '../activity/activity-log.service';
import { slugify } from '../../shared/utils/slugify';
import { paginate } from '../../shared/utils/pagination';
import { CreateDestinationDto } from './dto/create-destination.dto';
import { UpdateDestinationDto } from './dto/update-destination.dto';
import { ListDestinationsDto } from './dto/list-destinations.dto';

const DESTINATION_SELECT = {
  id: true,
  name: true,
  slug: true,
  country: true,
  latitude: true,
  longitude: true,
  description: true,
  images: true,
  tags: true,
  bestTime: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.DestinationSelect;

@Injectable()
export class DestinationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
  ) {}

  async findAll(query: ListDestinationsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.DestinationWhereInput = {
      deletedAt: null,
      ...(query.q ? { name: { contains: query.q } } : {}),
      ...(query.country ? { country: query.country } : {}),
    };

    const [items, totalItems] = await Promise.all([
      this.prisma.destination.findMany({
        where,
        select: DESTINATION_SELECT,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.destination.count({ where }),
    ]);

    return paginate(items, page, limit, totalItems);
  }

  async findBySlug(slug: string) {
    const destination = await this.prisma.destination.findFirst({
      where: { slug, deletedAt: null },
      select: DESTINATION_SELECT,
    });

    if (!destination) {
      throw new NotFoundException('Destination not found');
    }

    return destination;
  }

  async create(dto: CreateDestinationDto, actorId: bigint) {
    const slug = await this.generateUniqueSlug(dto.name);

    const destination = await this.prisma.destination.create({
      data: { ...dto, slug },
      select: DESTINATION_SELECT,
    });

    await this.activityLog.log({
      actorId,
      action: 'destination.created',
      resourceType: 'DESTINATION',
      resourceId: destination.id,
    });

    return destination;
  }

  async update(id: bigint, dto: UpdateDestinationDto, actorId: bigint) {
    await this.getActiveOrThrow(id);

    const destination = await this.prisma.destination.update({
      where: { id },
      data: dto,
      select: DESTINATION_SELECT,
    });

    await this.activityLog.log({
      actorId,
      action: 'destination.updated',
      resourceType: 'DESTINATION',
      resourceId: destination.id,
    });

    return destination;
  }

  async remove(id: bigint, actorId: bigint) {
    await this.getActiveOrThrow(id);

    const [propertyCount, productCount] = await Promise.all([
      this.prisma.property.count({ where: { destinationId: id, deletedAt: null } }),
      this.prisma.product.count({ where: { destinationId: id, deletedAt: null } }),
    ]);

    if (propertyCount > 0 || productCount > 0) {
      throw new BadRequestException('Destination still has active properties or products');
    }

    await this.prisma.destination.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.activityLog.log({
      actorId,
      action: 'destination.deleted',
      resourceType: 'DESTINATION',
      resourceId: id,
    });
  }

  private async getActiveOrThrow(id: bigint) {
    const destination = await this.prisma.destination.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });

    if (!destination) {
      throw new NotFoundException('Destination not found');
    }

    return destination;
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const base = slugify(name);
    let candidate = base;
    let suffix = 2;

    while (
      await this.prisma.destination.findUnique({ where: { slug: candidate }, select: { id: true } })
    ) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }
}
