import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, PropertyStatus, Prisma, RoomStatus } from '@prisma/client';
import { PropertyRepository } from '../property/property.repository';
import { RoomInventoryRepository } from '../room-inventory/room-inventory.repository';
import { RoomRepository } from '../room/room.repository';
import { BookingRepository } from './booking.repository';
import { CheckAvailabilityDto } from './dto/check-availability.dto';
import { CreateBookingDto } from './dto/create-booking.dto';

const MAX_NIGHTS = 30;

@Injectable()
export class BookingService {
  constructor(
    private readonly bookingRepository: BookingRepository,
    private readonly roomRepository: RoomRepository,
    private readonly propertyRepository: PropertyRepository,
    private readonly roomInventoryRepository: RoomInventoryRepository,
  ) {}

  /** Public — xem còn phòng không + báo giá trước khi nhập Guest Information. */
  async checkAvailability(dto: CheckAvailabilityDto) {
    const roomId = BigInt(dto.roomId);
    const { room } = await this.getBookableRoom(roomId);
    const { nights, dates } = this.parseStay(dto.checkInDate, dto.checkOutDate);

    const inventoryRows = await this.roomInventoryRepository.findByRoomAndDateRange(
      roomId,
      dates[0],
      dates[dates.length - 1],
    );
    const inventoryByDate = new Map(
      inventoryRows.map((row) => [row.date.toISOString().slice(0, 10), row]),
    );

    let totalPrice = new Prisma.Decimal(0);
    const unavailableDates: string[] = [];
    for (const date of dates) {
      const key = date.toISOString().slice(0, 10);
      const row = inventoryByDate.get(key);
      if (!row || row.availableRooms < 1) {
        unavailableDates.push(key);
        continue;
      }
      totalPrice = totalPrice.add(row.price ?? room.basePrice);
    }

    return {
      available: unavailableDates.length === 0,
      nights,
      totalPrice: unavailableDates.length === 0 ? totalPrice.toString() : null,
      currency: room.currency,
      unavailableDates,
    };
  }

  async create(userId: bigint, dto: CreateBookingDto) {
    const roomId = BigInt(dto.roomId);
    const { room, property } = await this.getBookableRoom(roomId);
    const { checkInDate, checkOutDate, dates } = this.parseStay(dto.checkInDate, dto.checkOutDate);

    if (room.capacity && dto.guests.length > room.capacity) {
      throw new BadRequestException(`This room fits at most ${room.capacity} guest(s)`);
    }

    const result = await this.bookingRepository.createBooking({
      userId,
      roomId,
      propertyId: property.id,
      propertyName: property.name,
      roomName: room.name,
      basePrice: room.basePrice,
      currency: room.currency,
      checkInDate,
      checkOutDate,
      dates,
      guests: dto.guests,
    });

    if (!result.ok) {
      const dateStr = result.date.toISOString().slice(0, 10);
      if (result.reason === 'MISSING_INVENTORY') {
        throw new BadRequestException(`This room has no availability set for ${dateStr} yet`);
      }
      throw new ConflictException(`This room is sold out for ${dateStr}`);
    }

    return result.booking;
  }

  /** My Bookings — status? = upcoming | completed | cancelled (bo trong la tat ca). */
  listMine(userId: bigint, status?: 'upcoming' | 'completed' | 'cancelled') {
    const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
    return this.bookingRepository.findManyByUser(userId, status, today);
  }

  /** Chi huy duoc booking CONFIRMED cua chinh minh va checkInDate chua toi. */
  async cancel(userId: bigint, bookingId: bigint) {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (booking.userId !== userId) {
      throw new ForbiddenException('You do not own this booking');
    }
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('This booking is already cancelled');
    }

    const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
    if (booking.checkInDate <= today) {
      throw new BadRequestException('Cannot cancel a booking that has already started');
    }

    const dates = this.enumerateNights(booking.checkInDate, booking.checkOutDate);
    const result = await this.bookingRepository.cancelBooking(bookingId, booking.roomId, dates);
    if (!result.ok) {
      throw new BadRequestException('This booking is already cancelled');
    }
    return result.booking;
  }

  /** Room phải ACTIVE và Property cha phải APPROVED — cùng luật public như Room/Room Inventory. */
  private async getBookableRoom(roomId: bigint) {
    const room = await this.roomRepository.findById(roomId);
    if (!room || room.status !== RoomStatus.ACTIVE) {
      throw new NotFoundException('Room not found');
    }
    const property = await this.propertyRepository.findById(room.propertyId);
    if (!property || property.status !== PropertyStatus.APPROVED) {
      throw new NotFoundException('Room not found');
    }
    return { room, property };
  }

  private parseStay(checkInRaw: string, checkOutRaw: string) {
    const checkInDate = new Date(`${checkInRaw}T00:00:00.000Z`);
    const checkOutDate = new Date(`${checkOutRaw}T00:00:00.000Z`);
    if (checkInDate >= checkOutDate) {
      throw new BadRequestException('checkOutDate must be after checkInDate');
    }

    const nights = Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (24 * 60 * 60 * 1000));
    if (nights > MAX_NIGHTS) {
      throw new BadRequestException(`Stay length cannot exceed ${MAX_NIGHTS} nights`);
    }

    return { checkInDate, checkOutDate, nights, dates: this.enumerateNights(checkInDate, checkOutDate) };
  }

  private enumerateNights(checkInDate: Date, checkOutDate: Date): Date[] {
    const nights = Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (24 * 60 * 60 * 1000));
    const dates: Date[] = [];
    for (let i = 0; i < nights; i += 1) {
      const date = new Date(checkInDate);
      date.setUTCDate(date.getUTCDate() + i);
      dates.push(date);
    }
    return dates;
  }
}
