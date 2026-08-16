import { Injectable } from '@nestjs/common';
import { Aircraft, AircraftStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AircraftRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    where: Prisma.AircraftWhereInput,
    skip: number,
    take: number,
    orderBy: Prisma.AircraftOrderByWithRelationInput = { createdAt: 'desc' },
  ): Promise<[Aircraft[], number]> {
    return this.prisma.$transaction([
      this.prisma.aircraft.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          provider: { select: { id: true, name: true, userId: true } },
        },
      }),
      this.prisma.aircraft.count({ where }),
    ]);
  }

  findById(id: bigint): Promise<Aircraft | null> {
    return this.prisma.aircraft.findFirst({
      where: { id, deletedAt: null },
      include: { provider: { select: { id: true, name: true, userId: true } } },
    });
  }

  findByRegistrationCode(registrationCode: string): Promise<Aircraft | null> {
    return this.prisma.aircraft.findUnique({ where: { registrationCode } });
  }

  create(data: Prisma.AircraftCreateInput): Promise<Aircraft> {
    return this.prisma.aircraft.create({ data });
  }

  update(id: bigint, data: Prisma.AircraftUpdateInput): Promise<Aircraft> {
    return this.prisma.aircraft.update({ where: { id }, data });
  }

  updateStatus(id: bigint, status: AircraftStatus): Promise<Aircraft> {
    return this.prisma.aircraft.update({ where: { id }, data: { status } });
  }

  softDelete(id: bigint): Promise<Aircraft> {
    return this.prisma.aircraft.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
