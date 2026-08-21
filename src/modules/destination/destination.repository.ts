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

  /** "Goi y cho ban" (V8) — gom moi destinationId user tung tuong tac qua bat ky trong 5 nguon
   * hanh vi that da co (khong tinh trong so, don gian hoa toi da cho vong dau): Wishlist,
   * Booking Hotel/Tour/Experience (qua Property/Tour/Experience.destinationId, co the null),
   * Review (destinationId truc tiep hoac qua property.destinationId). */
  private async findInteractedDestinationIds(userId: bigint): Promise<bigint[]> {
    const [wishlist, hotelBookings, tourBookings, experienceBookings, reviews] =
      await Promise.all([
        this.prisma.wishlistItem.findMany({
          where: { userId },
          select: { destinationId: true },
        }),
        this.prisma.hotelBooking.findMany({
          where: { userId },
          select: { property: { select: { destinationId: true } } },
        }),
        this.prisma.tourBooking.findMany({
          where: { userId },
          select: { tour: { select: { destinationId: true } } },
        }),
        this.prisma.experienceBooking.findMany({
          where: { userId },
          select: { experience: { select: { destinationId: true } } },
        }),
        this.prisma.review.findMany({
          where: { userId },
          select: {
            destinationId: true,
            property: { select: { destinationId: true } },
          },
        }),
      ]);

    const ids = new Set<string>();
    wishlist.forEach((w) => w.destinationId && ids.add(w.destinationId.toString()));
    hotelBookings.forEach(
      (b) => b.property?.destinationId && ids.add(b.property.destinationId.toString()),
    );
    tourBookings.forEach(
      (b) => b.tour?.destinationId && ids.add(b.tour.destinationId.toString()),
    );
    experienceBookings.forEach(
      (b) => b.experience?.destinationId && ids.add(b.experience.destinationId.toString()),
    );
    reviews.forEach((r) => {
      if (r.destinationId) ids.add(r.destinationId.toString());
      if (r.property?.destinationId) ids.add(r.property.destinationId.toString());
    });

    return Array.from(ids, (id) => BigInt(id));
  }

  /** Chua tuong tac gi (cold start) -> fallback findPopular. Co roi -> uu tien Destination cung
   * quoc gia voi noi da tung tuong tac, chua tuong tac toi; thieu thi backfill Destination
   * bat ky (moi nhat truoc) cho du limit. */
  async findRecommended(userId: bigint, limit: number): Promise<Destination[]> {
    const interactedIds = await this.findInteractedDestinationIds(userId);
    if (interactedIds.length === 0) {
      return this.findPopular(limit);
    }

    const interacted = await this.prisma.destination.findMany({
      where: { id: { in: interactedIds } },
      select: { country: true },
    });
    const countries = Array.from(
      new Set(interacted.map((d) => d.country).filter((c): c is string => !!c)),
    );

    const sameCountry = countries.length
      ? await this.prisma.destination.findMany({
          where: {
            deletedAt: null,
            country: { in: countries },
            id: { notIn: interactedIds },
          },
          take: limit,
          orderBy: { createdAt: 'desc' },
        })
      : [];

    if (sameCountry.length >= limit) {
      return sameCountry;
    }

    const excludeIds = [...interactedIds, ...sameCountry.map((d) => d.id)];
    const backfill = await this.prisma.destination.findMany({
      where: { deletedAt: null, id: { notIn: excludeIds } },
      take: limit - sameCountry.length,
      orderBy: { createdAt: 'desc' },
    });

    return [...sameCountry, ...backfill];
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
