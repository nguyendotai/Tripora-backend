import { Injectable } from '@nestjs/common';
import { Flight, FlightSchedule, FlightSeat, SeatClass } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class FlightSeatRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Doc rieng qua Prisma (khong qua FlightScheduleModule) de tranh circular import — xem
   * flight-schedule.module.ts phai import nguoc FlightSeatModule de tu sinh ghe khi tao lich moi. */
  findScheduleWithFlight(
    scheduleId: bigint,
  ): Promise<(FlightSchedule & { flight: Flight }) | null> {
    return this.prisma.flightSchedule.findUnique({
      where: { id: scheduleId },
      include: { flight: true },
    });
  }

  findByScheduleId(scheduleId: bigint): Promise<FlightSeat[]> {
    return this.prisma.flightSeat.findMany({
      where: { scheduleId },
      orderBy: [{ class: 'asc' }, { seatNumber: 'asc' }],
    });
  }

  findById(id: bigint): Promise<FlightSeat | null> {
    return this.prisma.flightSeat.findUnique({ where: { id } });
  }

  /** Dung o buoc validate truoc khi tao FlightBooking — xac nhan cac ghe duoc chon co that va
   * cung 1 scheduleId truoc khi flip status trong transaction. */
  findByIds(ids: bigint[]): Promise<FlightSeat[]> {
    return this.prisma.flightSeat.findMany({ where: { id: { in: ids } } });
  }

  async createMany(
    scheduleId: bigint,
    seats: { seatNumber: string; class: SeatClass }[],
  ): Promise<void> {
    if (seats.length === 0) return;
    await this.prisma.flightSeat.createMany({
      data: seats.map((seat) => ({
        scheduleId,
        seatNumber: seat.seatNumber,
        class: seat.class,
      })),
    });
  }
}
