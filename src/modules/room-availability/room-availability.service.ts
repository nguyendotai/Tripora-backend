import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ActivityLogService } from '../activity/activity-log.service';
import { AuthenticatedUser } from '../../common/guards/jwt-auth.guard';
import { UpsertRoomAvailabilityDto } from './dto/upsert-room-availability.dto';
import { UpdateRoomAvailabilityDto } from './dto/update-room-availability.dto';
import { ListRoomAvailabilityDto } from './dto/list-room-availability.dto';

const AVAILABILITY_SELECT = {
  id: true,
  roomId: true,
  date: true,
  total: true,
  available: true,
  price: true,
  status: true,
} satisfies Prisma.RoomAvailabilitySelect;

type PrismaOrTx = PrismaService | Prisma.TransactionClient;

@Injectable()
export class RoomAvailabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
  ) {}

  async findAll(roomId: bigint, query: ListRoomAvailabilityDto) {
    await this.getRoomOrThrow(roomId);

    return this.prisma.roomAvailability.findMany({
      where: {
        roomId,
        ...(query.from || query.to
          ? {
              date: {
                ...(query.from ? { gte: new Date(query.from) } : {}),
                ...(query.to ? { lte: new Date(query.to) } : {}),
              },
            }
          : {}),
      },
      select: AVAILABILITY_SELECT,
      orderBy: { date: 'asc' },
    });
  }

  async upsert(roomId: bigint, dto: UpsertRoomAvailabilityDto, user: AuthenticatedUser) {
    await this.assertOwnsRoomOrAdmin(roomId, user);

    const date = new Date(dto.date);

    const record = await this.prisma.roomAvailability.upsert({
      where: { roomId_date: { roomId, date } },
      update: { total: dto.total, price: dto.price },
      create: { roomId, date, total: dto.total, available: dto.total, price: dto.price },
      select: AVAILABILITY_SELECT,
    });

    await this.activityLog.log({
      actorId: BigInt(user.id),
      action: 'room-availability.upserted',
      resourceType: 'ROOM_AVAILABILITY',
      resourceId: record.id,
    });

    return record;
  }

  async update(id: bigint, dto: UpdateRoomAvailabilityDto, user: AuthenticatedUser) {
    const existing = await this.prisma.roomAvailability.findUnique({
      where: { id },
      select: { id: true, roomId: true, total: true, available: true },
    });
    if (!existing) {
      throw new NotFoundException('Room availability not found');
    }

    await this.assertOwnsRoomOrAdmin(existing.roomId, user);

    let available = existing.available;
    if (dto.total !== undefined) {
      const booked = existing.total - existing.available;
      if (dto.total < booked) {
        throw new BadRequestException(
          `Cannot set total below the number of units already booked (${booked})`,
        );
      }
      available = dto.total - booked;
    }

    const updated = await this.prisma.roomAvailability.update({
      where: { id },
      data: {
        ...(dto.total !== undefined ? { total: dto.total, available } : {}),
        ...(dto.price !== undefined ? { price: dto.price } : {}),
        ...(dto.status ? { status: dto.status } : {}),
      },
      select: AVAILABILITY_SELECT,
    });

    await this.activityLog.log({
      actorId: BigInt(user.id),
      action: 'room-availability.updated',
      resourceType: 'ROOM_AVAILABILITY',
      resourceId: id,
    });

    return updated;
  }

  /**
   * Trừ tồn kho atomic (chống Overbooking) — CHỈ dùng nội bộ Backend (Booking Service sau
   * này gọi trong transaction), không có endpoint public. Xem specs/room-availability.md mục 3
   * và business-rules.md mục 3. Trả `true` nếu trừ thành công, `false` nếu không đủ chỗ.
   */
  async decrementAvailability(
    client: PrismaOrTx,
    roomId: bigint,
    date: Date,
    quantity: number,
  ): Promise<boolean> {
    const result = await client.roomAvailability.updateMany({
      where: { roomId, date, available: { gte: quantity } },
      data: { available: { decrement: quantity } },
    });

    return result.count > 0;
  }

  /** Hoàn tồn kho khi Booking bị huỷ — CHỈ dùng nội bộ Backend, xem decrementAvailability(). */
  async incrementAvailability(
    client: PrismaOrTx,
    roomId: bigint,
    date: Date,
    quantity: number,
  ): Promise<void> {
    await client.roomAvailability.updateMany({
      where: { roomId, date },
      data: { available: { increment: quantity } },
    });
  }

  private async getRoomOrThrow(roomId: bigint) {
    const room = await this.prisma.room.findFirst({
      where: { id: roomId, deletedAt: null },
      select: { id: true, propertyId: true },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    return room;
  }

  private async assertOwnsRoomOrAdmin(roomId: bigint, user: AuthenticatedUser) {
    const room = await this.prisma.room.findFirst({
      where: { id: roomId, deletedAt: null },
      select: { id: true, property: { select: { partnerId: true } } },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) {
      return room;
    }

    const partner = await this.prisma.partner.findFirst({
      where: { ownerId: BigInt(user.id), deletedAt: null },
      select: { id: true },
    });

    if (!partner || partner.id !== room.property.partnerId) {
      throw new ForbiddenException('You do not own this room');
    }

    return room;
  }
}
