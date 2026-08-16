import { Injectable } from '@nestjs/common';
import { FlightBooking, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

class SoldOutError extends Error {
  constructor() {
    super('One or more selected seats are no longer available');
  }
}

export type CreateFlightBookingResult =
  | { ok: true; booking: FlightBookingWithPassengers }
  | { ok: false; reason: 'SOLD_OUT' };

export type CancelFlightBookingResult = { ok: true; booking: FlightBooking } | { ok: false };

export type FlightBookingWithPassengers = FlightBooking & {
  passengers: { id: bigint; seatId: bigint; fullName: string; idNumber: string }[];
};

export interface CreateFlightBookingParams {
  userId: bigint;
  scheduleId: bigint;
  seatIds: bigint[];
  passengers: { seatId: bigint; fullName: string; idNumber: string }[];
  flightNumber: string;
  departureAirportCode: string;
  arrivalAirportCode: string;
  departureDate: Date;
  departureTime: string;
  arrivalTime: string;
  totalPrice: Prisma.Decimal;
  currency: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
}

const passengerSelect = { id: true, seatId: true, fullName: true, idNumber: true } as const;

@Injectable()
export class FlightBookingRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Chong overbooking bang cach flip tung dong FlightSeat rieng (status AVAILABLE -> BOOKED) qua
   * raw UPDATE ... WHERE status = 'AVAILABLE' AND id IN (...), kiem tra affected rows = so ghe yeu
   * cau — khac TransportBooking/TourBooking (tru 1 bo dem tong), vi tong kho FlightSeat la tung
   * dong rieng (backend/CLAUDE.md muc 3 "Chong Overbooking", ap dung dung tinh than nhung khac co
   * che vi ban chat du lieu khac nhau).
   */
  async createBooking(params: CreateFlightBookingParams): Promise<CreateFlightBookingResult> {
    try {
      const booking = await this.prisma.$transaction(async (tx) => {
        const affected: number = await tx.$executeRaw(
          Prisma.sql`UPDATE flight_seats SET status = 'BOOKED', updated_at = NOW()
            WHERE schedule_id = ${params.scheduleId} AND status = 'AVAILABLE'
              AND id IN (${Prisma.join(params.seatIds)})`,
        );
        if (affected !== params.seatIds.length) {
          throw new SoldOutError();
        }

        return tx.flightBooking.create({
          data: {
            userId: params.userId,
            scheduleId: params.scheduleId,
            flightNumber: params.flightNumber,
            departureAirportCode: params.departureAirportCode,
            arrivalAirportCode: params.arrivalAirportCode,
            departureDate: params.departureDate,
            departureTime: params.departureTime,
            arrivalTime: params.arrivalTime,
            numberOfPassengers: params.seatIds.length,
            customerName: params.customerName,
            customerEmail: params.customerEmail,
            customerPhone: params.customerPhone,
            totalPrice: params.totalPrice,
            currency: params.currency,
            passengers: {
              create: params.passengers.map((p) => ({
                seatId: p.seatId,
                fullName: p.fullName,
                idNumber: p.idNumber,
              })),
            },
          },
          include: { passengers: { select: passengerSelect } },
        });
      });

      return { ok: true, booking };
    } catch (error) {
      if (error instanceof SoldOutError) {
        return { ok: false, reason: 'SOLD_OUT' };
      }
      throw error;
    }
  }

  findById(id: bigint): Promise<FlightBookingWithPassengers | null> {
    return this.prisma.flightBooking.findUnique({
      where: { id },
      include: { passengers: { select: passengerSelect } },
    });
  }

  /** Admin — xem toan bo FlightBooking cua moi User. */
  async findAll(
    where: Prisma.FlightBookingWhereInput,
    skip: number,
    take: number,
  ): Promise<
    [
      (FlightBookingWithPassengers & {
        user: { email: string; firstName: string | null; lastName: string | null };
      })[],
      number,
    ]
  > {
    return this.prisma.$transaction([
      this.prisma.flightBooking.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { email: true, firstName: true, lastName: true } },
          passengers: { select: passengerSelect },
        },
      }),
      this.prisma.flightBooking.count({ where }),
    ]);
  }

  findManyByUser(
    userId: bigint,
    filter: 'upcoming' | 'completed' | 'cancelled' | undefined,
    today: Date,
  ): Promise<FlightBookingWithPassengers[]> {
    const where = this.applyStatusFilter({ userId }, filter, today);
    return this.prisma.flightBooking.findMany({
      where,
      include: { passengers: { select: passengerSelect } },
      orderBy: { departureDate: 'desc' },
    });
  }

  /** Airline Provider — xem FlightBooking cua cac Flight minh so huu, optional loc theo 1 Flight. */
  findManyByProvider(
    providerId: bigint,
    flightId: bigint | undefined,
    filter: 'upcoming' | 'completed' | 'cancelled' | undefined,
    today: Date,
  ): Promise<
    (FlightBookingWithPassengers & {
      user: { email: string; firstName: string | null; lastName: string | null };
    })[]
  > {
    const where = this.applyStatusFilter(
      {
        schedule: { flight: { providerId, ...(flightId && { id: flightId }) } },
      },
      filter,
      today,
    );
    return this.prisma.flightBooking.findMany({
      where,
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
        passengers: { select: passengerSelect },
      },
      orderBy: { departureDate: 'desc' },
    });
  }

  private applyStatusFilter(
    base: Prisma.FlightBookingWhereInput,
    filter: 'upcoming' | 'completed' | 'cancelled' | undefined,
    today: Date,
  ): Prisma.FlightBookingWhereInput {
    const where: Prisma.FlightBookingWhereInput = { ...base };
    if (filter === 'upcoming') {
      where.status = 'CONFIRMED';
      where.departureDate = { gte: today };
    } else if (filter === 'completed') {
      where.status = 'CONFIRMED';
      where.departureDate = { lt: today };
    } else if (filter === 'cancelled') {
      where.status = 'CANCELLED';
    }
    return where;
  }

  /**
   * Hoan tra tung ghe ve AVAILABLE + chuyen status booking -> CANCELLED trong cung 1 transaction,
   * chi thanh cong neu status hien tai la CONFIRMED (kiem tra qua affected rows tranh race huy trung).
   */
  async cancelBooking(bookingId: bigint, seatIds: bigint[]): Promise<CancelFlightBookingResult> {
    const booking = await this.prisma.$transaction(async (tx) => {
      const affected: number = await tx.$executeRaw(
        Prisma.sql`UPDATE flight_bookings SET status = 'CANCELLED', updated_at = NOW()
          WHERE id = ${bookingId} AND status = 'CONFIRMED'`,
      );
      if (affected === 0) {
        return null;
      }

      if (seatIds.length > 0) {
        await tx.$executeRaw(
          Prisma.sql`UPDATE flight_seats SET status = 'AVAILABLE', updated_at = NOW()
            WHERE id IN (${Prisma.join(seatIds)}) AND status = 'BOOKED'`,
        );
      }

      return tx.flightBooking.findUnique({ where: { id: bookingId } });
    });

    if (!booking) {
      return { ok: false };
    }
    return { ok: true, booking };
  }
}
