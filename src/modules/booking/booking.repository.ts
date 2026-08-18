import { Injectable } from '@nestjs/common';
import { BookingStatus, Guest, HotelBooking, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

class MissingInventoryError extends Error {
  constructor(public readonly date: Date) {
    super('No inventory set for this date');
  }
}

class SoldOutError extends Error {
  constructor(public readonly date: Date) {
    super('Room sold out for this date');
  }
}

export type CreateBookingResult =
  | { ok: true; booking: HotelBooking & { guests: Guest[] } }
  | { ok: false; reason: 'MISSING_INVENTORY' | 'SOLD_OUT'; date: Date };

export type CancelBookingResult =
  | { ok: true; booking: HotelBooking & { guests: Guest[] } }
  | { ok: false };

export interface CreateBookingParams {
  userId: bigint;
  roomId: bigint;
  propertyId: bigint;
  propertyName: string;
  roomName: string;
  basePrice: Prisma.Decimal;
  currency: string;
  checkInDate: Date;
  checkOutDate: Date;
  dates: Date[];
  guests: { fullName: string; email?: string; phone?: string }[];
}

@Injectable()
export class BookingRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tru availableRooms atomic tung dem qua raw UPDATE ... WHERE available_rooms >= 1,
   * kiem tra affected rows — 0 thi rollback ca transaction (backend/CLAUDE.md muc 3).
   */
  async createBooking(params: CreateBookingParams): Promise<CreateBookingResult> {
    try {
      const booking = await this.prisma.$transaction(async (tx) => {
        let totalPrice = new Prisma.Decimal(0);

        for (const date of params.dates) {
          const inventory = await tx.roomInventory.findUnique({
            where: { roomId_date: { roomId: params.roomId, date } },
          });
          if (!inventory) {
            throw new MissingInventoryError(date);
          }
          totalPrice = totalPrice.add(inventory.price ?? params.basePrice);

          const dateStr = date.toISOString().slice(0, 10);
          const affected = await tx.$executeRaw`
            UPDATE room_inventory
            SET available_rooms = available_rooms - 1, booked_rooms = booked_rooms + 1
            WHERE room_id = ${params.roomId} AND date = ${dateStr} AND available_rooms >= 1
          `;
          if (affected === 0) {
            throw new SoldOutError(date);
          }
        }

        return tx.hotelBooking.create({
          data: {
            userId: params.userId,
            roomId: params.roomId,
            propertyId: params.propertyId,
            propertyName: params.propertyName,
            roomName: params.roomName,
            checkInDate: params.checkInDate,
            checkOutDate: params.checkOutDate,
            nights: params.dates.length,
            totalPrice,
            currency: params.currency,
            guests: { create: params.guests },
          },
          include: { guests: true },
        });
      });

      return { ok: true, booking };
    } catch (error) {
      if (error instanceof MissingInventoryError) {
        return { ok: false, reason: 'MISSING_INVENTORY', date: error.date };
      }
      if (error instanceof SoldOutError) {
        return { ok: false, reason: 'SOLD_OUT', date: error.date };
      }
      throw error;
    }
  }

  /** Cron het han giu cho — mirror y het cancelBooking, hoan tung dem qua lai (doi status ->
   * EXPIRED thay vi CANCELLED). Chi quet cac dong PENDING_PAYMENT qua han. */
  async expirePending(cutoff: Date): Promise<bigint[]> {
    const candidates = await this.prisma.hotelBooking.findMany({
      where: { status: BookingStatus.PENDING_PAYMENT, createdAt: { lt: cutoff } },
      select: { id: true, roomId: true, checkInDate: true, checkOutDate: true },
    });

    const expiredIds: bigint[] = [];
    for (const candidate of candidates) {
      const applied = await this.prisma.$transaction(async (tx) => {
        const affected = await tx.$executeRaw`
          UPDATE hotel_bookings SET status = 'EXPIRED', updated_at = NOW()
          WHERE id = ${candidate.id} AND status = 'PENDING_PAYMENT'
        `;
        if (affected === 0) return false;

        const nights = Math.round(
          (candidate.checkOutDate.getTime() - candidate.checkInDate.getTime()) / (24 * 60 * 60 * 1000),
        );
        for (let i = 0; i < nights; i += 1) {
          const date = new Date(candidate.checkInDate);
          date.setUTCDate(date.getUTCDate() + i);
          const dateStr = date.toISOString().slice(0, 10);
          await tx.$executeRaw`
            UPDATE room_inventory
            SET available_rooms = available_rooms + 1, booked_rooms = booked_rooms - 1
            WHERE room_id = ${candidate.roomId} AND date = ${dateStr} AND booked_rooms >= 1
          `;
        }
        return true;
      });
      if (applied) expiredIds.push(candidate.id);
    }
    return expiredIds;
  }

  findById(id: bigint): Promise<HotelBooking | null> {
    return this.prisma.hotelBooking.findUnique({ where: { id } });
  }

  /** Admin — xem toan bo Booking cua moi User. */
  async findAll(
    where: Prisma.HotelBookingWhereInput,
    skip: number,
    take: number,
  ): Promise<[(HotelBooking & { guests: Guest[]; user: { email: string; firstName: string | null; lastName: string | null } })[], number]> {
    return this.prisma.$transaction([
      this.prisma.hotelBooking.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          guests: true,
          user: { select: { email: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.hotelBooking.count({ where }),
    ]);
  }

  findManyByUser(
    userId: bigint,
    filter: 'upcoming' | 'completed' | 'cancelled' | undefined,
    today: Date,
  ): Promise<(HotelBooking & { guests: Guest[] })[]> {
    const where = this.applyStatusFilter({ userId }, filter, today);
    return this.prisma.hotelBooking.findMany({
      where,
      include: { guests: true },
      orderBy: { checkInDate: 'desc' },
    });
  }

  /** Provider — xem Booking cua cac Property minh so huu, optional loc theo 1 Property. */
  findManyByProvider(
    providerId: bigint,
    propertyId: bigint | undefined,
    filter: 'upcoming' | 'completed' | 'cancelled' | undefined,
    today: Date,
  ): Promise<
    (HotelBooking & {
      guests: Guest[];
      user: { email: string; firstName: string | null; lastName: string | null };
    })[]
  > {
    const where = this.applyStatusFilter(
      {
        property: { providerId },
        ...(propertyId && { propertyId }),
      },
      filter,
      today,
    );
    return this.prisma.hotelBooking.findMany({
      where,
      include: {
        guests: true,
        user: { select: { email: true, firstName: true, lastName: true } },
      },
      orderBy: { checkInDate: 'desc' },
    });
  }

  /** V7 vong 9 — dieu kien "da mua" truoc khi cho Review Property (khong dung BookingStatus.COMPLETED
   * vi enum nay chua tung duoc set o dau trong code, CONFIRMED la bang chung dang tin cay hien co). */
  async hasConfirmedBookingForProperty(
    userId: bigint,
    propertyId: bigint,
  ): Promise<boolean> {
    const count = await this.prisma.hotelBooking.count({
      where: {
        userId,
        propertyId,
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
      },
    });
    return count > 0;
  }

  private applyStatusFilter(
    base: Prisma.HotelBookingWhereInput,
    filter: 'upcoming' | 'completed' | 'cancelled' | undefined,
    today: Date,
  ): Prisma.HotelBookingWhereInput {
    const where: Prisma.HotelBookingWhereInput = { ...base };
    if (filter === 'upcoming') {
      where.status = BookingStatus.CONFIRMED;
      where.checkOutDate = { gte: today };
    } else if (filter === 'completed') {
      where.status = BookingStatus.CONFIRMED;
      where.checkOutDate = { lt: today };
    } else if (filter === 'cancelled') {
      where.status = BookingStatus.CANCELLED;
    }
    return where;
  }

  /**
   * Hoan tra availableRooms/bookedRooms atomic tung dem, cung 1 transaction voi
   * viec chuyen status -> CANCELLED (chi thanh cong neu status hien tai la CONFIRMED,
   * kiem tra qua affected rows de tranh race huy trung).
   */
  async cancelBooking(
    bookingId: bigint,
    roomId: bigint,
    dates: Date[],
  ): Promise<CancelBookingResult> {
    const booking = await this.prisma.$transaction(async (tx) => {
      const affected = await tx.$executeRaw`
        UPDATE hotel_bookings SET status = 'CANCELLED', updated_at = NOW()
        WHERE id = ${bookingId} AND status = 'CONFIRMED'
      `;
      if (affected === 0) {
        return null;
      }

      for (const date of dates) {
        const dateStr = date.toISOString().slice(0, 10);
        await tx.$executeRaw`
          UPDATE room_inventory
          SET available_rooms = available_rooms + 1, booked_rooms = booked_rooms - 1
          WHERE room_id = ${roomId} AND date = ${dateStr} AND booked_rooms >= 1
        `;
      }

      return tx.hotelBooking.findUnique({ where: { id: bookingId }, include: { guests: true } });
    });

    if (!booking) {
      return { ok: false };
    }
    return { ok: true, booking };
  }
}
