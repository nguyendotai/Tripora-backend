import { Injectable } from '@nestjs/common';
import { TransportSchedule } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TransportScheduleRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: bigint): Promise<TransportSchedule | null> {
    return this.prisma.transportSchedule.findUnique({ where: { id } });
  }

  findByRouteAndDateRange(
    routeId: bigint,
    vehicleId: bigint | undefined,
    startDate: Date,
    endDate: Date,
  ): Promise<TransportSchedule[]> {
    return this.prisma.transportSchedule.findMany({
      where: {
        routeId,
        ...(vehicleId && { vehicleId }),
        departureDate: { gte: startDate, lte: endDate },
      },
      orderBy: { departureDate: 'asc' },
    });
  }

  findByRouteVehicleAndDate(
    routeId: bigint,
    vehicleId: bigint,
    departureDate: Date,
  ): Promise<TransportSchedule | null> {
    return this.prisma.transportSchedule.findUnique({
      where: {
        routeId_vehicleId_departureDate: { routeId, vehicleId, departureDate },
      },
    });
  }

  create(data: {
    routeId: bigint;
    vehicleId: bigint;
    departureDate: Date;
    capacity: number;
    available: number;
    price?: number;
  }): Promise<TransportSchedule> {
    return this.prisma.transportSchedule.create({
      data: {
        departureDate: data.departureDate,
        capacity: data.capacity,
        available: data.available,
        price: data.price,
        route: { connect: { id: data.routeId } },
        vehicle: { connect: { id: data.vehicleId } },
      },
    });
  }

  update(
    id: bigint,
    data: { capacity: number; available: number; price?: number },
  ): Promise<TransportSchedule> {
    return this.prisma.transportSchedule.update({
      where: { id },
      data: {
        capacity: data.capacity,
        available: data.available,
        ...(data.price !== undefined && { price: data.price }),
      },
    });
  }
}
