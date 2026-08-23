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

  /** V9 vong 8 — Occupancy Provider. Khac 4 domain kia — moi row la 1 ghe vat ly, khong co cot
   * dem san, phai tra ve row-per-seat de Service tu dem theo ngay (qua schedule.departureDate). */
  findByProviderSince(providerId: bigint, since: Date) {
    return this.prisma.flightSeat.findMany({
      where: {
        schedule: { flight: { providerId }, departureDate: { gte: since } },
      },
      select: { status: true, schedule: { select: { departureDate: true } } },
    });
  }
}
