import { Injectable } from '@nestjs/common';
import { Prisma, Trip, TripDay, TripItem } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

const TRIP_DETAIL_INCLUDE = {
  days: {
    orderBy: { dayNumber: Prisma.SortOrder.asc },
    include: {
      items: {
        orderBy: { sortOrder: Prisma.SortOrder.asc },
        include: { destination: true },
      },
    },
  },
} satisfies Prisma.TripInclude;

@Injectable()
export class TripRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findManyByUser(
    userId: bigint,
    skip: number,
    take: number,
  ): Promise<[Trip[], number]> {
    const where: Prisma.TripWhereInput = { userId, deletedAt: null };
    return this.prisma.$transaction([
      this.prisma.trip.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.trip.count({ where }),
    ]);
  }

  findById(id: bigint): Promise<Trip | null> {
    return this.prisma.trip.findFirst({ where: { id, deletedAt: null } });
  }

  findByIdWithDetail(id: bigint) {
    return this.prisma.trip.findFirst({
      where: { id, deletedAt: null },
      include: TRIP_DETAIL_INCLUDE,
    });
  }

  create(data: Prisma.TripCreateInput): Promise<Trip> {
    return this.prisma.trip.create({ data });
  }

  update(id: bigint, data: Prisma.TripUpdateInput): Promise<Trip> {
    return this.prisma.trip.update({ where: { id }, data });
  }

  softDelete(id: bigint): Promise<Trip> {
    return this.prisma.trip.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  findDayById(id: bigint) {
    return this.prisma.tripDay.findUnique({
      where: { id },
      include: { trip: true },
    });
  }

  async nextDayNumber(tripId: bigint): Promise<number> {
    const last = await this.prisma.tripDay.findFirst({
      where: { tripId },
      orderBy: { dayNumber: 'desc' },
    });
    return (last?.dayNumber ?? 0) + 1;
  }

  createDay(data: Prisma.TripDayCreateInput): Promise<TripDay> {
    return this.prisma.tripDay.create({ data });
  }

  deleteDay(id: bigint): Promise<TripDay> {
    return this.prisma.tripDay.delete({ where: { id } });
  }

  findItemById(id: bigint) {
    return this.prisma.tripItem.findUnique({
      where: { id },
      include: { tripDay: { include: { trip: true } } },
    });
  }

  async nextSortOrder(tripDayId: bigint): Promise<number> {
    const last = await this.prisma.tripItem.findFirst({
      where: { tripDayId },
      orderBy: { sortOrder: 'desc' },
    });
    return (last?.sortOrder ?? 0) + 1;
  }

  createItem(data: Prisma.TripItemCreateInput): Promise<TripItem> {
    return this.prisma.tripItem.create({ data });
  }

  updateItem(id: bigint, data: Prisma.TripItemUpdateInput): Promise<TripItem> {
    return this.prisma.tripItem.update({ where: { id }, data });
  }

  deleteItem(id: bigint): Promise<TripItem> {
    return this.prisma.tripItem.delete({ where: { id } });
  }

  reorderItems(orderedIds: bigint[]): Promise<TripItem[]> {
    return this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.tripItem.update({ where: { id }, data: { sortOrder: index + 1 } }),
      ),
    );
  }
}
