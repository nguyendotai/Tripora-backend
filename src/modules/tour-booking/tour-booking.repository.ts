import { Injectable } from '@nestjs/common';
import { BookingStatus, Prisma, TourBooking } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

class MissingScheduleError extends Error {
  constructor() {
    super('No schedule set for this departure date');
  }
}

class SoldOutError extends Error {
  constructor() {
    super('Not enough seats available for this departure date');
  }
}

export type CreateTourBookingResult =
  | { ok: true; booking: TourBooking }
  | { ok: false; reason: 'MISSING_SCHEDULE' | 'SOLD_OUT' };

export type CancelTourBookingResult = { ok: true; booking: TourBooking } | { ok: false };

export interface CreateTourBookingParams {
  userId: bigint;
  tourId: bigint;
  tourTitle: string;
  basePrice: Prisma.Decimal;
  currency: string;
  departureDate: Date;
  numberOfPeople: number;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
}

@Injectable()
export class TourBookingRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tru available atomic qua raw UPDATE ... WHERE available >= :numberOfPeople,
   * kiem tra affected rows — 0 thi rollback ca transaction (backend/CLAUDE.md muc 3).
   */
  async createBooking(params: CreateTourBookingParams): Promise<CreateTourBookingResult> {
    try {
      const booking = await this.prisma.$transaction(async (tx) => {
        const dateStr = params.departureDate.toISOString().slice(0, 10);
        const schedule = await tx.tourSchedule.findUnique({
          where: { tourId_departureDate: { tourId: params.tourId, departureDate: params.departureDate } },
        });
        if (!schedule) {
          throw new MissingScheduleError();
        }

        const affected = await tx.$executeRaw`
          UPDATE tour_schedules
          SET available = available - ${params.numberOfPeople}, booked = booked + ${params.numberOfPeople}
          WHERE tour_id = ${params.tourId} AND departure_date = ${dateStr} AND available >= ${params.numberOfPeople}
        `;
        if (affected === 0) {
          throw new SoldOutError();
        }

        const pricePerPerson = schedule.price ?? params.basePrice;
        const totalPrice = pricePerPerson.mul(params.numberOfPeople);

        return tx.tourBooking.create({
          data: {
            userId: params.userId,
            tourId: params.tourId,
            tourTitle: params.tourTitle,
            departureDate: params.departureDate,
            numberOfPeople: params.numberOfPeople,
            customerName: params.customerName,
            customerEmail: params.customerEmail,
            customerPhone: params.customerPhone,
            totalPrice,
            currency: params.currency,
          },
        });
      });

      return { ok: true, booking };
    } catch (error) {
      if (error instanceof MissingScheduleError) {
        return { ok: false, reason: 'MISSING_SCHEDULE' };
      }
      if (error instanceof SoldOutError) {
        return { ok: false, reason: 'SOLD_OUT' };
      }
      throw error;
    }
  }

  findById(id: bigint): Promise<TourBooking | null> {
    return this.prisma.tourBooking.findUnique({ where: { id } });
  }

  /** Admin — xem toan bo TourBooking cua moi User. */
  async findAll(
    where: Prisma.TourBookingWhereInput,
    skip: number,
    take: number,
  ): Promise<
    [(TourBooking & { user: { email: string; firstName: string | null; lastName: string | null } })[], number]
  > {
    return this.prisma.$transaction([
      this.prisma.tourBooking.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { email: true, firstName: true, lastName: true } } },
      }),
      this.prisma.tourBooking.count({ where }),
    ]);
  }

  findManyByUser(
    userId: bigint,
    filter: 'upcoming' | 'completed' | 'cancelled' | undefined,
    today: Date,
  ): Promise<TourBooking[]> {
    const where = this.applyStatusFilter({ userId }, filter, today);
    return this.prisma.tourBooking.findMany({ where, orderBy: { departureDate: 'desc' } });
  }

  /** Tour Operator — xem TourBooking cua cac Tour minh so huu, optional loc theo 1 Tour. */
  findManyByProvider(
    providerId: bigint,
    tourId: bigint | undefined,
    filter: 'upcoming' | 'completed' | 'cancelled' | undefined,
    today: Date,
  ): Promise<
    (TourBooking & { user: { email: string; firstName: string | null; lastName: string | null } })[]
  > {
    const where = this.applyStatusFilter(
      {
        tour: { providerId },
        ...(tourId && { tourId }),
      },
      filter,
      today,
    );
    return this.prisma.tourBooking.findMany({
      where,
      include: { user: { select: { email: true, firstName: true, lastName: true } } },
      orderBy: { departureDate: 'desc' },
    });
  }

  private applyStatusFilter(
    base: Prisma.TourBookingWhereInput,
    filter: 'upcoming' | 'completed' | 'cancelled' | undefined,
    today: Date,
  ): Prisma.TourBookingWhereInput {
    const where: Prisma.TourBookingWhereInput = { ...base };
    if (filter === 'upcoming') {
      where.status = BookingStatus.CONFIRMED;
      where.departureDate = { gte: today };
    } else if (filter === 'completed') {
      where.status = BookingStatus.CONFIRMED;
      where.departureDate = { lt: today };
    } else if (filter === 'cancelled') {
      where.status = BookingStatus.CANCELLED;
    }
    return where;
  }

  /**
   * Hoan available/booked atomic, cung 1 transaction voi viec chuyen status -> CANCELLED
   * (chi thanh cong neu status hien tai la CONFIRMED, kiem tra qua affected rows de tranh
   * race huy trung — cung tinh than voi Hotel Booking).
   */
  async cancelBooking(
    bookingId: bigint,
    tourId: bigint,
    departureDate: Date,
    numberOfPeople: number,
  ): Promise<CancelTourBookingResult> {
    const booking = await this.prisma.$transaction(async (tx) => {
      const affected = await tx.$executeRaw`
        UPDATE tour_bookings SET status = 'CANCELLED', updated_at = NOW()
        WHERE id = ${bookingId} AND status = 'CONFIRMED'
      `;
      if (affected === 0) {
        return null;
      }

      const dateStr = departureDate.toISOString().slice(0, 10);
      await tx.$executeRaw`
        UPDATE tour_schedules
        SET available = available + ${numberOfPeople}, booked = booked - ${numberOfPeople}
        WHERE tour_id = ${tourId} AND departure_date = ${dateStr} AND booked >= ${numberOfPeople}
      `;

      return tx.tourBooking.findUnique({ where: { id: bookingId } });
    });

    if (!booking) {
      return { ok: false };
    }
    return { ok: true, booking };
  }
}
