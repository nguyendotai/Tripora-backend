import { Injectable } from '@nestjs/common';
import { Prisma, TourItinerary } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TourItineraryRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(where: Prisma.TourItineraryWhereInput): Promise<TourItinerary[]> {
    return this.prisma.tourItinerary.findMany({ where, orderBy: { dayNumber: 'asc' } });
  }

  findById(id: bigint): Promise<TourItinerary | null> {
    return this.prisma.tourItinerary.findUnique({ where: { id } });
  }

  async nextDayNumber(tourId: bigint): Promise<number> {
    const last = await this.prisma.tourItinerary.findFirst({
      where: { tourId },
      orderBy: { dayNumber: 'desc' },
    });
    return (last?.dayNumber ?? 0) + 1;
  }

  create(data: Prisma.TourItineraryCreateInput): Promise<TourItinerary> {
    return this.prisma.tourItinerary.create({ data });
  }

  update(id: bigint, data: Prisma.TourItineraryUpdateInput): Promise<TourItinerary> {
    return this.prisma.tourItinerary.update({ where: { id }, data });
  }

  delete(id: bigint): Promise<TourItinerary> {
    return this.prisma.tourItinerary.delete({ where: { id } });
  }
}
