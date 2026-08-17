import { Injectable } from '@nestjs/common';
import { Prisma, Tour, TourStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TourRepository {
  constructor(private readonly prisma: PrismaService) {}

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
        include: {
          destination: { select: { id: true, name: true, slug: true } },
          provider: { select: { id: true, name: true, userId: true } },
        },
      }),
      this.prisma.tour.count({ where }),
    ]);
  }

  findBySlug(slug: string): Promise<Tour | null> {
    return this.prisma.tour.findFirst({
      where: { slug, deletedAt: null },
      include: {
        destination: { select: { id: true, name: true, slug: true } },
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
