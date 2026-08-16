import { Injectable } from '@nestjs/common';
import { Prisma, TransportRoute, TransportRouteStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TransportRouteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    where: Prisma.TransportRouteWhereInput,
    skip: number,
    take: number,
    orderBy: Prisma.TransportRouteOrderByWithRelationInput = {
      createdAt: 'desc',
    },
  ): Promise<[TransportRoute[], number]> {
    return this.prisma.$transaction([
      this.prisma.transportRoute.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          provider: { select: { id: true, name: true, userId: true } },
        },
      }),
      this.prisma.transportRoute.count({ where }),
    ]);
  }

  findById(id: bigint): Promise<TransportRoute | null> {
    return this.prisma.transportRoute.findFirst({
      where: { id, deletedAt: null },
      include: { provider: { select: { id: true, name: true, userId: true } } },
    });
  }

  create(data: Prisma.TransportRouteCreateInput): Promise<TransportRoute> {
    return this.prisma.transportRoute.create({ data });
  }

  update(
    id: bigint,
    data: Prisma.TransportRouteUpdateInput,
  ): Promise<TransportRoute> {
    return this.prisma.transportRoute.update({ where: { id }, data });
  }

  updateStatus(
    id: bigint,
    status: TransportRouteStatus,
  ): Promise<TransportRoute> {
    return this.prisma.transportRoute.update({
      where: { id },
      data: { status },
    });
  }

  softDelete(id: bigint): Promise<TransportRoute> {
    return this.prisma.transportRoute.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
