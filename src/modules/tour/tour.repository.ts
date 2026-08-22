import { Injectable } from '@nestjs/common';
import { BookingStatus, Prisma, Tour, TourStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

const TOUR_LIST_INCLUDE = {
  destination: { select: { id: true, name: true, slug: true } },
  provider: { select: { id: true, name: true, userId: true } },
} satisfies Prisma.TourInclude;

@Injectable()
export class TourRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** "Noi bat" = duoc dat nhieu nhat (TourBooking CONFIRMED/COMPLETED) — mirror
   * PropertyRepository.findPopular. */
  async findPopular(limit: number): Promise<Tour[]> {
    const grouped = await this.prisma.tourBooking.groupBy({
      by: ['tourId'],
      where: {
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
      },
      _count: { tourId: true },
      orderBy: { _count: { tourId: 'desc' } },
      take: limit,
    });
    if (grouped.length === 0) {
      return [];
    }

    const items = await this.prisma.tour.findMany({
      where: {
        id: { in: grouped.map((g) => g.tourId) },
        status: TourStatus.APPROVED,
        deletedAt: null,
      },
      include: TOUR_LIST_INCLUDE,
    });
    const byId = new Map(items.map((item) => [item.id.toString(), item]));

    return grouped
      .map((g) => byId.get(g.tourId.toString()))
      .filter((item): item is (typeof items)[number] => !!item);
  }

  async findMany(
    where: Prisma.TourWhereInput,
    skip: number,
    take: number,
    orderBy: Prisma.TourOrderByWithRelationInput = { createdAt: 'desc' },
  ): Promise<[Tour[], number]> {
    return this.prisma.$transaction([
      this.prisma.tour.findMany({
        where,
        skip,
        take,
        orderBy,
        include: TOUR_LIST_INCLUDE,
      }),
      this.prisma.tour.count({ where }),
    ]);
  }

  findBySlug(slug: string): Promise<Tour | null> {
    return this.prisma.tour.findFirst({
      where: { slug, deletedAt: null },
      include: {
        destination: { select: { id: true, name: true, slug: true } },
        provider: { select: { id: true, name: true, userId: true } },
      },
    });
  }

  findBySlugExact(slug: string): Promise<Tour | null> {
    return this.prisma.tour.findUnique({ where: { slug } });
  }

  findById(id: bigint): Promise<Tour | null> {
    return this.prisma.tour.findFirst({ where: { id, deletedAt: null } });
  }

  create(data: Prisma.TourCreateInput): Promise<Tour> {
    return this.prisma.tour.create({ data });
  }

  update(id: bigint, data: Prisma.TourUpdateInput): Promise<Tour> {
    return this.prisma.tour.update({ where: { id }, data });
  }

  updateStatus(id: bigint, status: TourStatus): Promise<Tour> {
    return this.prisma.tour.update({ where: { id }, data: { status } });
  }

  softDelete(id: bigint): Promise<Tour> {
    return this.prisma.tour.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
