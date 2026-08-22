import { Injectable } from '@nestjs/common';
import {
  BookingStatus,
  Prisma,
  ProviderStatus,
  ReportStatus,
  Role,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

const BOOKED_STATUSES: BookingStatus[] = [
  BookingStatus.CONFIRMED,
  BookingStatus.COMPLETED,
];

@Injectable()
export class ReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async countUsers() {
    const [total, active, inactive, banned, admins] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({
        where: { deletedAt: null, status: UserStatus.ACTIVE },
      }),
      this.prisma.user.count({
        where: { deletedAt: null, status: UserStatus.INACTIVE },
      }),
      this.prisma.user.count({
        where: { deletedAt: null, status: UserStatus.BANNED },
      }),
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

  /** V9 vong 4 — Analytics Dashboard (Platform). Mirror CommissionRepository.getSummary nhung
   * bo filter providerId (tong toan san), dung platformAmount (phan Platform thuc nhan) thay vi
   * providerAmount. */
  async getPlatformCommissionSummary() {
    const [totalTransactions, totalAgg] = await Promise.all([
      this.prisma.commission.count(),
      this.prisma.commission.aggregate({ _sum: { platformAmount: true } }),
    ]);
    return {
      totalTransactions,
      totalRevenue: totalAgg._sum.platformAmount ?? new Prisma.Decimal(0),
    };
  }

  /** Mirror CommissionRepository.findByProviderIdSince, bo filter providerId. */
  findAllCommissionsSince(since: Date) {
    return this.prisma.commission.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async countBookingsByDomain() {
    const [hotel, tour, experience, transport, flight] = await Promise.all([
      this.prisma.hotelBooking.count({
        where: { status: { in: BOOKED_STATUSES } },
      }),
      this.prisma.tourBooking.count({
        where: { status: { in: BOOKED_STATUSES } },
      }),
      this.prisma.experienceBooking.count({
        where: { status: { in: BOOKED_STATUSES } },
      }),
      this.prisma.transportBooking.count({
        where: { status: { in: BOOKED_STATUSES } },
      }),
      this.prisma.flightBooking.count({
        where: { status: { in: BOOKED_STATUSES } },
      }),
    ]);
    return {
      total: hotel + tour + experience + transport + flight,
      byDomain: {
        HOTEL: hotel,
        TOUR: tour,
        EXPERIENCE: experience,
        TRANSPORT: transport,
        FLIGHT: flight,
      },
    };
  }

  async countProvidersByStatus() {
    const [total, pending, approved, rejected, suspended] = await Promise.all([
      this.prisma.provider.count(),
      this.prisma.provider.count({ where: { status: ProviderStatus.PENDING } }),
      this.prisma.provider.count({
        where: { status: ProviderStatus.APPROVED },
      }),
      this.prisma.provider.count({
        where: { status: ProviderStatus.REJECTED },
      }),
      this.prisma.provider.count({
        where: { status: ProviderStatus.SUSPENDED },
      }),
    ]);
    return { total, pending, approved, rejected, suspended };
  }

  /** Conversion 30 ngay = |giao(user da VIEW, user da co Booking)| / |user da VIEW| * 100 — chi
   * tinh user da dang nhap (khong co he thong visitor id cho khach an danh, xem ghi chu vong 4). */
  async getConversion30d(since: Date) {
    const [
      viewedRows,
      hotelUsers,
      tourUsers,
      experienceUsers,
      transportUsers,
      flightUsers,
    ] = await Promise.all([
      this.prisma.analyticsEvent.findMany({
        where: {
          type: 'VIEW',
          userId: { not: null },
          createdAt: { gte: since },
        },
        distinct: ['userId'],
        select: { userId: true },
      }),
      this.prisma.hotelBooking.findMany({
        where: { status: { in: BOOKED_STATUSES }, createdAt: { gte: since } },
        distinct: ['userId'],
        select: { userId: true },
      }),
      this.prisma.tourBooking.findMany({
        where: { status: { in: BOOKED_STATUSES }, createdAt: { gte: since } },
        distinct: ['userId'],
        select: { userId: true },
      }),
      this.prisma.experienceBooking.findMany({
        where: { status: { in: BOOKED_STATUSES }, createdAt: { gte: since } },
        distinct: ['userId'],
        select: { userId: true },
      }),
      this.prisma.transportBooking.findMany({
        where: { status: { in: BOOKED_STATUSES }, createdAt: { gte: since } },
        distinct: ['userId'],
        select: { userId: true },
      }),
      this.prisma.flightBooking.findMany({
        where: { status: { in: BOOKED_STATUSES }, createdAt: { gte: since } },
        distinct: ['userId'],
        select: { userId: true },
      }),
    ]);

    const viewedUserIds = new Set(
      viewedRows.map((row) => row.userId!.toString()),
    );
    const bookedUserIds = new Set(
      [
        ...hotelUsers,
        ...tourUsers,
        ...experienceUsers,
        ...transportUsers,
        ...flightUsers,
      ].map((row) => row.userId.toString()),
    );
    const convertedUserIds = [...viewedUserIds].filter((id) =>
      bookedUserIds.has(id),
    );

    return {
      viewedUsers: viewedUserIds.size,
      convertedUsers: convertedUserIds.length,
      rate:
        viewedUserIds.size === 0
          ? 0
          : (convertedUserIds.length / viewedUserIds.size) * 100,
    };
  }

  /** V9 vong 7 — Report generation (job nen). Report = snapshot JSON cua analytics() tai thoi
   * diem tao, khong phai file CSV/PDF (tranh them dependency moi cho 1 lat cat). */
  createReport(requestedBy: bigint) {
    return this.prisma.report.create({ data: { requestedBy } });
  }

  markCompleted(id: bigint, data: Prisma.InputJsonValue) {
    return this.prisma.report.update({
      where: { id },
      data: { status: ReportStatus.COMPLETED, data, completedAt: new Date() },
    });
  }

  markFailed(id: bigint, errorMessage: string) {
    return this.prisma.report.update({
      where: { id },
      data: {
        status: ReportStatus.FAILED,
        errorMessage,
        completedAt: new Date(),
      },
    });
  }

  async findMany(where: Prisma.ReportWhereInput, skip: number, take: number) {
    const [items, totalItems] = await Promise.all([
      this.prisma.report.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.report.count({ where }),
    ]);
    return [items, totalItems] as const;
  }

  findById(id: bigint) {
    return this.prisma.report.findUnique({ where: { id } });
  }
}
