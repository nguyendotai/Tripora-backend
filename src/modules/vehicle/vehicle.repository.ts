import { Injectable } from '@nestjs/common';
import { Prisma, Vehicle, VehicleStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class VehicleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    where: Prisma.VehicleWhereInput,
    skip: number,
    take: number,
    orderBy: Prisma.VehicleOrderByWithRelationInput = { createdAt: 'desc' },
  ): Promise<[Vehicle[], number]> {
    return this.prisma.$transaction([
      this.prisma.vehicle.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          provider: { select: { id: true, name: true, userId: true } },
        },
      }),
      this.prisma.vehicle.count({ where }),
    ]);
  }

  findById(id: bigint): Promise<Vehicle | null> {
    return this.prisma.vehicle.findFirst({
      where: { id, deletedAt: null },
      include: { provider: { select: { id: true, name: true, userId: true } } },
    });
  }

  findByLicensePlate(licensePlate: string): Promise<Vehicle | null> {
    return this.prisma.vehicle.findUnique({ where: { licensePlate } });
  }

  create(data: Prisma.VehicleCreateInput): Promise<Vehicle> {
    return this.prisma.vehicle.create({ data });
  }

  update(id: bigint, data: Prisma.VehicleUpdateInput): Promise<Vehicle> {
    return this.prisma.vehicle.update({ where: { id }, data });
  }

  updateStatus(id: bigint, status: VehicleStatus): Promise<Vehicle> {
    return this.prisma.vehicle.update({ where: { id }, data: { status } });
  }

  softDelete(id: bigint): Promise<Vehicle> {
    return this.prisma.vehicle.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
