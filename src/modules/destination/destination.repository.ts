import { Injectable } from '@nestjs/common';
import { Destination, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class DestinationRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** "Noi bat" = duoc luu (Wishlist) nhieu nhat — mirror
   * ReportRepository.topDestinationsByWishlist nhung re-fetch du field cho card Frontend. */
  async findPopular(limit: number): Promise<Destination[]> {
    const grouped = await this.prisma.wishlistItem.groupBy({
      by: ['destinationId'],
      _count: { destinationId: true },
      orderBy: { _count: { destinationId: 'desc' } },
      take: limit,
    });
    if (grouped.length === 0) {
      return [];
    }

    const items = await this.prisma.destination.findMany({
      where: { id: { in: grouped.map((g) => g.destinationId) }, deletedAt: null },
    });
    const byId = new Map(items.map((item) => [item.id.toString(), item]));

    return grouped
      .map((g) => byId.get(g.destinationId.toString()))
      .filter((item): item is (typeof items)[number] => !!item);
  }

  async findMany(
    where: Prisma.DestinationWhereInput,
    skip: number,
    take: number,
  ): Promise<[Destination[], number]> {
    return this.prisma.$transaction([
      this.prisma.destination.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.destination.count({ where }),
    ]);
  }

  findBySlug(slug: string): Promise<Destination | null> {
    return this.prisma.destination.findFirst({
      where: { slug, deletedAt: null },
    });
  }

  findById(id: bigint): Promise<Destination | null> {
    return this.prisma.destination.findFirst({
      where: { id, deletedAt: null },
    });
  }

  findBySlugExact(slug: string): Promise<Destination | null> {
    return this.prisma.destination.findUnique({ where: { slug } });
  }

  create(data: Prisma.DestinationCreateInput): Promise<Destination> {
    return this.prisma.destination.create({ data });
  }

  update(id: bigint, data: Prisma.DestinationUpdateInput): Promise<Destination> {
    return this.prisma.destination.update({ where: { id }, data });
  }

  softDelete(id: bigint): Promise<Destination> {
    return this.prisma.destination.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
