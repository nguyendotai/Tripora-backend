import { Injectable } from '@nestjs/common';
import { Airport, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AirportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    where: Prisma.AirportWhereInput,
    skip: number,
    take: number,
  ): Promise<[Airport[], number]> {
    return this.prisma.$transaction([
      this.prisma.airport.findMany({
        where,
        skip,
        take,
        orderBy: { code: 'asc' },
      }),
      this.prisma.airport.count({ where }),
    ]);
  }

  findById(id: bigint): Promise<Airport | null> {
    return this.prisma.airport.findFirst({ where: { id, deletedAt: null } });
  }

  findByCode(code: string): Promise<Airport | null> {
    return this.prisma.airport.findUnique({ where: { code } });
  }

  create(data: Prisma.AirportCreateInput): Promise<Airport> {
    return this.prisma.airport.create({ data });
  }

  update(id: bigint, data: Prisma.AirportUpdateInput): Promise<Airport> {
    return this.prisma.airport.update({ where: { id }, data });
  }

  softDelete(id: bigint): Promise<Airport> {
    return this.prisma.airport.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
