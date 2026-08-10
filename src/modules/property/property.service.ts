import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PartnerStatus, Prisma, PropertyStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ActivityLogService } from '../activity/activity-log.service';
import { paginate } from '../../shared/utils/pagination';
import { slugify } from '../../shared/utils/slugify';
import { AuthenticatedUser } from '../../common/guards/jwt-auth.guard';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { ListPropertiesDto } from './dto/list-properties.dto';

const PROPERTY_SELECT = {
  id: true,
  partnerId: true,
  destinationId: true,
  type: true,
  name: true,
  slug: true,
  description: true,
  address: true,
  city: true,
  country: true,
  latitude: true,
  longitude: true,
  images: true,
  amenities: true,
  ratingAverage: true,
  ratingCount: true,
  checkInTime: true,
  checkOutTime: true,
  cancellationPolicy: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PropertySelect;

@Injectable()
export class PropertyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
  ) {}

  async findAllPublic(query: ListPropertiesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.PropertyWhereInput = {
      status: PropertyStatus.ACTIVE,
      deletedAt: null,
      partner: { status: PartnerStatus.ACTIVE },
      ...(query.q ? { name: { contains: query.q } } : {}),
      ...(query.destinationId ? { destinationId: BigInt(query.destinationId) } : {}),
      ...(query.type ? { type: query.type } : {}),
    };

    const [items, totalItems] = await Promise.all([
      this.prisma.property.findMany({
        where,
        select: PROPERTY_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.property.count({ where }),
    ]);

    return paginate(items, page, limit, totalItems);
  }

  async findOnePublic(id: bigint) {
    const property = await this.prisma.property.findFirst({
      where: {
        id,
        status: PropertyStatus.ACTIVE,
        deletedAt: null,
        partner: { status: PartnerStatus.ACTIVE },
      },
      select: PROPERTY_SELECT,
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    return property;
  }

  async findMine(userId: bigint) {
    const partner = await this.getOwnedPartnerOrThrow(userId);

    return this.prisma.property.findMany({
      where: { partnerId: partner.id, deletedAt: null },
      select: PROPERTY_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPendingApproval() {
    return this.prisma.property.findMany({
      where: { status: PropertyStatus.PENDING_APPROVAL, deletedAt: null },
      select: PROPERTY_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(dto: CreatePropertyDto, user: AuthenticatedUser) {
    const partner = await this.getVerifiedPartnerOrThrow(BigInt(user.id));

    const destination = await this.prisma.destination.findFirst({
      where: { id: BigInt(dto.destinationId), deletedAt: null },
      select: { id: true },
    });
    if (!destination) {
      throw new BadRequestException('Destination not found');
    }

    const slug = await this.generateUniqueSlug(dto.name);
    const { destinationId, ...rest } = dto;

    const property = await this.prisma.property.create({
      data: {
        ...rest,
        slug,
        partnerId: partner.id,
        destinationId: BigInt(destinationId),
        status: PropertyStatus.PENDING_APPROVAL,
      },
      select: PROPERTY_SELECT,
    });

    await this.activityLog.log({
      actorId: BigInt(user.id),
      action: 'property.created',
      resourceType: 'PROPERTY',
      resourceId: property.id,
    });

    return property;
  }

  async update(id: bigint, dto: UpdatePropertyDto, user: AuthenticatedUser) {
    const property = await this.getActiveOrThrow(id);
    await this.assertOwnershipOrAdmin(property.partnerId, user);

    const { destinationId, ...rest } = dto;

    const updated = await this.prisma.property.update({
      where: { id },
      data: {
        ...rest,
        ...(destinationId ? { destinationId: BigInt(destinationId) } : {}),
      },
      select: PROPERTY_SELECT,
    });

    await this.activityLog.log({
      actorId: BigInt(user.id),
      action: 'property.updated',
      resourceType: 'PROPERTY',
      resourceId: id,
    });

    return updated;
  }

  async approve(id: bigint, actorId: bigint) {
    const property = await this.getActiveOrThrow(id);

    if (property.status !== PropertyStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Property is not pending approval');
    }

    const updated = await this.prisma.property.update({
      where: { id },
      data: { status: PropertyStatus.ACTIVE },
      select: PROPERTY_SELECT,
    });

    await this.activityLog.log({
      actorId,
      action: 'property.approved',
      resourceType: 'PROPERTY',
      resourceId: id,
    });

    return updated;
  }

  async reject(id: bigint, reason: string, actorId: bigint) {
    const property = await this.getActiveOrThrow(id);

    if (property.status !== PropertyStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Property is not pending approval');
    }

    const updated = await this.prisma.property.update({
      where: { id },
      data: { status: PropertyStatus.INACTIVE },
      select: PROPERTY_SELECT,
    });

    await this.activityLog.log({
      actorId,
      action: 'property.rejected',
      resourceType: 'PROPERTY',
      resourceId: id,
      metadata: { reason },
    });

    return updated;
  }

  async remove(id: bigint, user: AuthenticatedUser) {
    const property = await this.getActiveOrThrow(id);
    await this.assertOwnershipOrAdmin(property.partnerId, user);

    const activeRoomCount = await this.prisma.room.count({
      where: { propertyId: id, deletedAt: null },
    });
    if (activeRoomCount > 0) {
      throw new BadRequestException('Property still has active rooms');
    }

    await this.prisma.property.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.activityLog.log({
      actorId: BigInt(user.id),
      action: 'property.deleted',
      resourceType: 'PROPERTY',
      resourceId: id,
    });
  }

  private async getActiveOrThrow(id: bigint) {
    const property = await this.prisma.property.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, partnerId: true, status: true },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    return property;
  }

  private async assertOwnershipOrAdmin(partnerId: bigint, user: AuthenticatedUser) {
    if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) {
      return;
    }

    const partner = await this.getOwnedPartnerOrThrow(BigInt(user.id));
    if (partner.id !== partnerId) {
      throw new ForbiddenException('You do not own this property');
    }
  }

  private async getOwnedPartnerOrThrow(userId: bigint) {
    const partner = await this.prisma.partner.findFirst({
      where: { ownerId: userId, deletedAt: null },
      select: { id: true, verificationStatus: true, status: true },
    });

    if (!partner) {
      throw new ForbiddenException('You do not have a Partner profile');
    }

    return partner;
  }

  private async getVerifiedPartnerOrThrow(userId: bigint) {
    const partner = await this.getOwnedPartnerOrThrow(userId);

    if (partner.verificationStatus !== 'VERIFIED' || partner.status !== 'ACTIVE') {
      throw new ForbiddenException('Partner is not verified or is suspended');
    }

    return partner;
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const base = slugify(name);
    let candidate = base;
    let suffix = 2;

    while (
      await this.prisma.property.findUnique({ where: { slug: candidate }, select: { id: true } })
    ) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }
}
