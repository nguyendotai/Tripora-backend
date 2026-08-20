import { Injectable } from '@nestjs/common';
import { BookingStatus, Prisma, Property, PropertyStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

const PROPERTY_LIST_INCLUDE = {
  destination: { select: { id: true, name: true, slug: true } },
  provider: { select: { id: true, name: true, userId: true } },
} satisfies Prisma.PropertyInclude;

@Injectable()
export class PropertyRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** "Noi bat" = duoc dat nhieu nhat (Booking CONFIRMED/COMPLETED) — mirror
   * ReportRepository.topDestinationsByWishlist (groupBy + re-fetch giu thu tu). */
  async findPopular(limit: number): Promise<Property[]> {
    const grouped = await this.prisma.hotelBooking.groupBy({
      by: ['propertyId'],
      where: {
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
      },
      _count: { propertyId: true },
      orderBy: { _count: { propertyId: 'desc' } },
      take: limit,
    });
    if (grouped.length === 0) {
      return [];
    }

    const items = await this.prisma.property.findMany({
      where: {
        id: { in: grouped.map((g) => g.propertyId) },
        status: PropertyStatus.APPROVED,
        deletedAt: null,
      },
      include: PROPERTY_LIST_INCLUDE,
    });
    const byId = new Map(items.map((item) => [item.id.toString(), item]));

    return grouped
      .map((g) => byId.get(g.propertyId.toString()))
      .filter((item): item is (typeof items)[number] => !!item);
  }

  async findMany(
    where: Prisma.PropertyWhereInput,
    skip: number,
    take: number,
    orderBy: Prisma.PropertyOrderByWithRelationInput = { createdAt: 'desc' },
  ): Promise<[Property[], number]> {
    return this.prisma.$transaction([
      this.prisma.property.findMany({
        where,
        skip,
        take,
        orderBy,
        include: PROPERTY_LIST_INCLUDE,
      }),
      this.prisma.property.count({ where }),
    ]);
  }

  /** Gia thap nhat trong so cac Room ACTIVE cua tung Property — dung cho the "tu X d/dem". */
  async findMinPricesByPropertyIds(propertyIds: bigint[]): Promise<Map<bigint, Prisma.Decimal>> {
    if (propertyIds.length === 0) {
      return new Map();
    }
    const grouped = await this.prisma.room.groupBy({
      by: ['propertyId'],
      where: { propertyId: { in: propertyIds }, status: 'ACTIVE', deletedAt: null },
      _min: { basePrice: true },
    });
    return new Map(
      grouped
        .filter((g) => g._min.basePrice !== null)
        .map((g) => [g.propertyId, g._min.basePrice as Prisma.Decimal]),
    );
  }

  findBySlug(slug: string): Promise<Property | null> {
    return this.prisma.property.findFirst({
      where: { slug, deletedAt: null },
      include: { destination: { select: { id: true, name: true, slug: true } } },
    });
  }

  findBySlugExact(slug: string): Promise<Property | null> {
    return this.prisma.property.findUnique({ where: { slug } });
  }

  findById(id: bigint): Promise<Property | null> {
    return this.prisma.property.findFirst({ where: { id, deletedAt: null } });
  }

  /** V7 vong 10 — dung de gom Review cua toan bo Property thuoc 1 Provider. */
  async findIdsByProviderId(providerId: bigint): Promise<bigint[]> {
    const rows = await this.prisma.property.findMany({
      where: { providerId, deletedAt: null },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  create(data: Prisma.PropertyCreateInput): Promise<Property> {
    return this.prisma.property.create({ data });
  }

  update(id: bigint, data: Prisma.PropertyUpdateInput): Promise<Property> {
    return this.prisma.property.update({ where: { id }, data });
  }

  updateStatus(id: bigint, status: PropertyStatus): Promise<Property> {
    return this.prisma.property.update({ where: { id }, data: { status } });
  }

  softDelete(id: bigint): Promise<Property> {
    return this.prisma.property.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
