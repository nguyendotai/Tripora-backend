import { Injectable } from '@nestjs/common';
import { BookingStatus, Prisma, TransportBooking } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

class MissingScheduleError extends Error {
  constructor() {
    super('No schedule set for this route/vehicle/date');
  }
}

class SoldOutError extends Error {
  constructor() {
    super('Not enough seats available for this departure date');
  }
}

export type CreateTransportBookingResult =
  | { ok: true; booking: TransportBooking }
  | { ok: false; reason: 'MISSING_SCHEDULE' | 'SOLD_OUT' };

export type CancelTransportBookingResult =
  { ok: true; booking: TransportBooking } | { ok: false };

export interface CreateTransportBookingParams {
  userId: bigint;
  routeId: bigint;
  vehicleId: bigint;
  routeOrigin: string;
  routeDestination: string;
  vehicleName: string;
  basePrice: Prisma.Decimal;
  currency: string;
  departureDate: Date;
  numberOfPeople: number;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
}

@Injectable()
export class TransportBookingRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tru available atomic qua raw UPDATE ... WHERE available >= :numberOfPeople,
   * kiem tra affected rows — 0 thi rollback ca transaction (backend/CLAUDE.md muc 3).
   * Khac TourBooking: WHERE khop ca route_id lan vehicle_id (composite key cua TransportSchedule).
   */
  async createBooking(
    params: CreateTransportBookingParams,
  ): Promise<CreateTransportBookingResult> {
    try {
      const booking = await this.prisma.$transaction(async (tx) => {
        const dateStr = params.departureDate.toISOString().slice(0, 10);
        const schedule = await tx.transportSchedule.findUnique({
          where: {
            routeId_vehicleId_departureDate: {
              routeId: params.routeId,
              vehicleId: params.vehicleId,
              departureDate: params.departureDate,
            },
          },
        });
        if (!schedule) {
          throw new MissingScheduleError();
        }

        const affected = await tx.$executeRaw`
          UPDATE transport_schedules
          SET available = available - ${params.numberOfPeople}, booked = booked + ${params.numberOfPeople}
          WHERE route_id = ${params.routeId} AND vehicle_id = ${params.vehicleId}
            AND departure_date = ${dateStr} AND available >= ${params.numberOfPeople}
        `;
        if (affected === 0) {
          throw new SoldOutError();
        }

        const pricePerPerson = schedule.price ?? params.basePrice;
        const totalPrice = pricePerPerson.mul(params.numberOfPeople);

        return tx.transportBooking.create({
          data: {
            userId: params.userId,
            routeId: params.routeId,
            vehicleId: params.vehicleId,
            routeOrigin: params.routeOrigin,
            routeDestination: params.routeDestination,
            vehicleName: params.vehicleName,
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

  findById(id: bigint): Promise<TransportBooking | null> {
    return this.prisma.transportBooking.findUnique({ where: { id } });
  }

  /** Admin — xem toan bo TransportBooking cua moi User. */
  async findAll(
    where: Prisma.TransportBookingWhereInput,
    skip: number,
    take: number,
  ): Promise<
    [
      (TransportBooking & {
        user: {
          email: string;
          firstName: string | null;
          lastName: string | null;
        };
      })[],
      number,
    ]
  > {
    return this.prisma.$transaction([
      this.prisma.transportBooking.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { email: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.transportBooking.count({ where }),
    ]);
  }

  findManyByUser(
    userId: bigint,
    filter: 'upcoming' | 'completed' | 'cancelled' | undefined,
    today: Date,
  ): Promise<TransportBooking[]> {
    const where = this.applyStatusFilter({ userId }, filter, today);
    return this.prisma.transportBooking.findMany({
      where,
      orderBy: { departureDate: 'desc' },
    });
  }

  /** Transport Operator — xem TransportBooking cua cac Route minh so huu, optional loc theo 1 Route. */
  findManyByProvider(
    providerId: bigint,
    routeId: bigint | undefined,
    filter: 'upcoming' | 'completed' | 'cancelled' | undefined,
    today: Date,
  ): Promise<
    (TransportBooking & {
      user: {
        email: string;
        firstName: string | null;
        lastName: string | null;
      };
    })[]
  > {
    const where = this.applyStatusFilter(
      {
        route: { providerId },
        ...(routeId && { routeId }),
      },
      filter,
      today,
    );
    return this.prisma.transportBooking.findMany({
      where,
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
      },
      orderBy: { departureDate: 'desc' },
    });
  }

  private applyStatusFilter(
    base: Prisma.TransportBookingWhereInput,
    filter: 'upcoming' | 'completed' | 'cancelled' | undefined,
    today: Date,
  ): Prisma.TransportBookingWhereInput {
    const where: Prisma.TransportBookingWhereInput = { ...base };
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
   * race huy trung — cung tinh than voi Tour/Hotel Booking).
   */
  async cancelBooking(
    bookingId: bigint,
    routeId: bigint,
    vehicleId: bigint,
    departureDate: Date,
    numberOfPeople: number,
  ): Promise<CancelTransportBookingResult> {
    const booking = await this.prisma.$transaction(async (tx) => {
      const affected = await tx.$executeRaw`
        UPDATE transport_bookings SET status = 'CANCELLED', updated_at = NOW()
        WHERE id = ${bookingId} AND status = 'CONFIRMED'
      `;
      if (affected === 0) {
        return null;
      }

      const dateStr = departureDate.toISOString().slice(0, 10);
      await tx.$executeRaw`
        UPDATE transport_schedules
        SET available = available + ${numberOfPeople}, booked = booked - ${numberOfPeople}
        WHERE route_id = ${routeId} AND vehicle_id = ${vehicleId}
          AND departure_date = ${dateStr} AND booked >= ${numberOfPeople}
      `;

      return tx.transportBooking.findUnique({ where: { id: bookingId } });
    });

    if (!booking) {
      return { ok: false };
    }
    return { ok: true, booking };
  }
}
