import { Injectable } from '@nestjs/common';
import { FlightSchedule } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class FlightScheduleRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: bigint): Promise<FlightSchedule | null> {
    return this.prisma.flightSchedule.findUnique({ where: { id } });
  }

  findByFlightAndDateRange(
    flightId: bigint,
    startDate: Date,
    endDate: Date,
  ): Promise<FlightSchedule[]> {
    return this.prisma.flightSchedule.findMany({
      where: { flightId, departureDate: { gte: startDate, lte: endDate } },
      orderBy: { departureDate: 'asc' },
    });
  }

  findByFlightAndDate(flightId: bigint, departureDate: Date): Promise<FlightSchedule | null> {
    return this.prisma.flightSchedule.findUnique({
      where: { flightId_departureDate: { flightId, departureDate } },
    });
  }

  create(data: {
    flightId: bigint;
    departureDate: Date;
    departureTime: string;
    arrivalTime: string;
    economyPrice: number;
    businessPrice?: number;
  }): Promise<FlightSchedule> {
    return this.prisma.flightSchedule.create({
      data: {
        departureDate: data.departureDate,
        departureTime: data.departureTime,
        arrivalTime: data.arrivalTime,
        economyPrice: data.economyPrice,
        businessPrice: data.businessPrice,
        flight: { connect: { id: data.flightId } },
      },
    });
  }

  update(
    id: bigint,
    data: {
      departureTime: string;
      arrivalTime: string;
      economyPrice: number;
      businessPrice?: number;
    },
  ): Promise<FlightSchedule> {
    return this.prisma.flightSchedule.update({
      where: { id },
      data: {
        departureTime: data.departureTime,
        arrivalTime: data.arrivalTime,
        economyPrice: data.economyPrice,
        ...(data.businessPrice !== undefined && { businessPrice: data.businessPrice }),
      },
    });
  }
}
