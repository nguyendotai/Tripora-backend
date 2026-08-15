import { Injectable } from '@nestjs/common';
import { Guest, HotelBooking, Prisma } from '@prisma/client';
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
}
