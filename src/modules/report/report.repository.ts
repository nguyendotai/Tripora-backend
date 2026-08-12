import { Injectable } from '@nestjs/common';
import { Role, UserStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async countUsers() {
    const [total, active, inactive, banned, admins] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { deletedAt: null, status: UserStatus.ACTIVE } }),
      this.prisma.user.count({ where: { deletedAt: null, status: UserStatus.INACTIVE } }),
      this.prisma.user.count({ where: { deletedAt: null, status: UserStatus.BANNED } }),
      this.prisma.user.count({ where: { deletedAt: null, role: Role.ADMIN } }),
    ]);
    return { total, active, inactive, banned, admins };
  }

  countDestinations() {
    return this.prisma.destination.count({ where: { deletedAt: null } });
  }

  countTravelGuides() {
    return this.prisma.travelGuide.count({ where: { deletedAt: null } });
  }

  countBlogPosts() {
    return this.prisma.blogPost.count({ where: { deletedAt: null } });
  }

  countTrips() {
    return this.prisma.trip.count({ where: { deletedAt: null } });
  }

  async reviewStats() {
    const [total, aggregate] = await Promise.all([
      this.prisma.review.count({ where: { deletedAt: null } }),
      this.prisma.review.aggregate({
        where: { deletedAt: null },
        _avg: { rating: true },
      }),
    ]);
    return { total, averageRating: aggregate._avg.rating ?? 0 };
  }

  countWishlistItems() {
    return this.prisma.wishlistItem.count();
  }

  async topDestinationsByWishlist(limit: number) {
    const grouped = await this.prisma.wishlistItem.groupBy({
      by: ['destinationId'],
      _count: { destinationId: true },
      orderBy: { _count: { destinationId: 'desc' } },
      take: limit,
    });

    if (grouped.length === 0) return [];

    const destinations = await this.prisma.destination.findMany({
      where: { id: { in: grouped.map((g) => g.destinationId) } },
      select: { id: true, name: true, slug: true },
    });
    const byId = new Map(destinations.map((d) => [d.id.toString(), d]));

    return grouped
      .map((g) => ({
        destination: byId.get(g.destinationId.toString()) ?? null,
        wishlistCount: g._count.destinationId,
      }))
      .filter((row) => row.destination !== null);
  }
}
