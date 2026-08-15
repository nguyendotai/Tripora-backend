import { Injectable } from '@nestjs/common';
import { ExperienceSchedule } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ExperienceScheduleRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByExperienceAndDateRange(
    experienceId: bigint,
    startDate: Date,
    endDate: Date,
  ): Promise<ExperienceSchedule[]> {
    return this.prisma.experienceSchedule.findMany({
      where: { experienceId, departureDate: { gte: startDate, lte: endDate } },
      orderBy: { departureDate: 'asc' },
    });
  }

  findByExperienceAndDate(
    experienceId: bigint,
    departureDate: Date,
  ): Promise<ExperienceSchedule | null> {
    return this.prisma.experienceSchedule.findUnique({
      where: { experienceId_departureDate: { experienceId, departureDate } },
    });
  }

  create(data: {
    experienceId: bigint;
    departureDate: Date;
    capacity: number;
    available: number;
    price?: number;
  }): Promise<ExperienceSchedule> {
    return this.prisma.experienceSchedule.create({
      data: {
        departureDate: data.departureDate,
        capacity: data.capacity,
        available: data.available,
        price: data.price,
        experience: { connect: { id: data.experienceId } },
      },
    });
  }

  update(
    id: bigint,
    data: { capacity: number; available: number; price?: number },
  ): Promise<ExperienceSchedule> {
    return this.prisma.experienceSchedule.update({
      where: { id },
      data: {
        capacity: data.capacity,
        available: data.available,
        ...(data.price !== undefined && { price: data.price }),
      },
    });
  }
}
