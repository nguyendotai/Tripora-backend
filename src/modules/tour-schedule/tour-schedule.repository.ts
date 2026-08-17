import { Injectable } from '@nestjs/common';
import { Tour, TourSchedule } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TourScheduleRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: bigint): Promise<TourSchedule | null> {
    return this.prisma.tourSchedule.findUnique({ where: { id } });
  }

  /** Tour Guide — cac ngay khoi hanh minh duoc phan cong, kem thong tin Tour cha. */
  findByGuideId(guideId: bigint): Promise<(TourSchedule & { tour: Tour })[]> {
    return this.prisma.tourSchedule.findMany({
      where: { guideId },
      include: { tour: true },
      orderBy: { departureDate: 'desc' },
    });
  }

  assignGuide(id: bigint, guideId: bigint | null): Promise<TourSchedule> {
    return this.prisma.tourSchedule.update({
      where: { id },
      data: { guideId },
    });
  }

  /** Goi khi 1 Guide bi xoa — tranh de lai guideId "ma" tro toi ho so da xoa. */
  async unassignGuideFromAll(guideId: bigint): Promise<void> {
    await this.prisma.tourSchedule.updateMany({
      where: { guideId },
      data: { guideId: null },
    });
  }

  findByTourAndDateRange(
    tourId: bigint,
    startDate: Date,
    endDate: Date,
  ): Promise<TourSchedule[]> {
    return this.prisma.tourSchedule.findMany({
      where: { tourId, departureDate: { gte: startDate, lte: endDate } },
      orderBy: { departureDate: 'asc' },
    });
  }

  findByTourAndDate(
    tourId: bigint,
    departureDate: Date,
  ): Promise<TourSchedule | null> {
    return this.prisma.tourSchedule.findUnique({
      where: { tourId_departureDate: { tourId, departureDate } },
    });
  }

  create(data: {
    tourId: bigint;
    departureDate: Date;
    capacity: number;
    available: number;
    price?: number;
  }): Promise<TourSchedule> {
    return this.prisma.tourSchedule.create({
      data: {
        departureDate: data.departureDate,
        capacity: data.capacity,
        available: data.available,
        price: data.price,
        tour: { connect: { id: data.tourId } },
      },
    });
  }

  update(
    id: bigint,
    data: { capacity: number; available: number; price?: number },
  ): Promise<TourSchedule> {
    return this.prisma.tourSchedule.update({
      where: { id },
      data: {
        capacity: data.capacity,
        available: data.available,
        ...(data.price !== undefined && { price: data.price }),
      },
    });
  }
}
