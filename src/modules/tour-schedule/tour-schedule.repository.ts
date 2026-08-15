import { Injectable } from '@nestjs/common';
import { TourSchedule } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TourScheduleRepository {
  constructor(private readonly prisma: PrismaService) {}

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

  findByTourAndDate(tourId: bigint, departureDate: Date): Promise<TourSchedule | null> {
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
