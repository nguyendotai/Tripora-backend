import { Injectable } from '@nestjs/common';
import { Prisma, Property, PropertyStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PropertyRepository {
  constructor(private readonly prisma: PrismaService) {}

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
        include: {
          destination: { select: { id: true, name: true, slug: true } },
          provider: { select: { id: true, name: true, userId: true } },
        },
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
