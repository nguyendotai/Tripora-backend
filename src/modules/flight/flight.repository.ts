import { Injectable } from '@nestjs/common';
import { Flight, FlightStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

const includeRelations = {
  provider: { select: { id: true, name: true, userId: true } },
  aircraft: { select: { id: true, model: true, registrationCode: true } },
  departureAirport: {
    select: { id: true, code: true, name: true, city: true },
  },
  arrivalAirport: { select: { id: true, code: true, name: true, city: true } },
} satisfies Prisma.FlightInclude;

@Injectable()
export class FlightRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    where: Prisma.FlightWhereInput,
    skip: number,
    take: number,
    orderBy: Prisma.FlightOrderByWithRelationInput = { createdAt: 'desc' },
  ): Promise<[Flight[], number]> {
    return this.prisma.$transaction([
      this.prisma.flight.findMany({
        where,
        skip,
        take,
        orderBy,
        include: includeRelations,
      }),
      this.prisma.flight.count({ where }),
    ]);
  }

  findById(id: bigint): Promise<Flight | null> {
    return this.prisma.flight.findFirst({
      where: { id, deletedAt: null },
      include: includeRelations,
    });
  }

  create(data: Prisma.FlightCreateInput): Promise<Flight> {
    return this.prisma.flight.create({ data });
  }

  update(id: bigint, data: Prisma.FlightUpdateInput): Promise<Flight> {
    return this.prisma.flight.update({ where: { id }, data });
  }

  updateStatus(id: bigint, status: FlightStatus): Promise<Flight> {
    return this.prisma.flight.update({ where: { id }, data: { status } });
  }

  softDelete(id: bigint): Promise<Flight> {
    return this.prisma.flight.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
