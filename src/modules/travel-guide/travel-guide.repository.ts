import { Injectable } from '@nestjs/common';
import { Prisma, TravelGuide } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TravelGuideRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    where: Prisma.TravelGuideWhereInput,
    skip: number,
    take: number,
  ): Promise<[TravelGuide[], number]> {
    return this.prisma.$transaction([
      this.prisma.travelGuide.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.travelGuide.count({ where }),
    ]);
  }

  findBySlug(slug: string): Promise<TravelGuide | null> {
    return this.prisma.travelGuide.findFirst({
      where: { slug, deletedAt: null },
    });
  }

  findById(id: bigint): Promise<TravelGuide | null> {
    return this.prisma.travelGuide.findFirst({
      where: { id, deletedAt: null },
    });
  }

  findBySlugExact(slug: string): Promise<TravelGuide | null> {
    return this.prisma.travelGuide.findUnique({ where: { slug } });
  }

  create(data: Prisma.TravelGuideCreateInput): Promise<TravelGuide> {
    return this.prisma.travelGuide.create({ data });
  }

  update(
    id: bigint,
    data: Prisma.TravelGuideUpdateInput,
  ): Promise<TravelGuide> {
    return this.prisma.travelGuide.update({ where: { id }, data });
  }

  softDelete(id: bigint): Promise<TravelGuide> {
    return this.prisma.travelGuide.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
