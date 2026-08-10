import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RoomStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ActivityLogService } from '../activity/activity-log.service';
import { AuthenticatedUser } from '../../common/guards/jwt-auth.guard';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

const ROOM_SELECT = {
  id: true,
  propertyId: true,
  name: true,
  type: true,
  capacityAdults: true,
  capacityChildren: true,
  bedType: true,
  amenities: true,
  images: true,
  basePrice: true,
  currency: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.RoomSelect;

@Injectable()
export class RoomService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
  ) {}

  async findAllPublic(propertyId: bigint) {
    await this.getActivePropertyOrThrow(propertyId);

    return this.prisma.room.findMany({
      where: { propertyId, status: RoomStatus.ACTIVE, deletedAt: null },
      select: ROOM_SELECT,
      orderBy: { basePrice: 'asc' },
    });
  }

  async findAllMine(propertyId: bigint, user: AuthenticatedUser) {
    await this.assertOwnsPropertyOrAdmin(propertyId, user);

    return this.prisma.room.findMany({
      where: { propertyId, deletedAt: null },
      select: ROOM_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOnePublic(id: bigint) {
    const room = await this.prisma.room.findFirst({
      where: { id, status: RoomStatus.ACTIVE, deletedAt: null },
      select: ROOM_SELECT,
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    return room;
  }

  async create(propertyId: bigint, dto: CreateRoomDto, user: AuthenticatedUser) {
    await this.assertOwnsPropertyOrAdmin(propertyId, user);

    const room = await this.prisma.room.create({
      data: { ...dto, propertyId },
      select: ROOM_SELECT,
    });

    await this.activityLog.log({
      actorId: BigInt(user.id),
      action: 'room.created',
      resourceType: 'ROOM',
      resourceId: room.id,
    });

    return room;
  }

  async update(id: bigint, dto: UpdateRoomDto, user: AuthenticatedUser) {
    const room = await this.getActiveOrThrow(id);
    await this.assertOwnsPropertyOrAdmin(room.propertyId, user);

    const updated = await this.prisma.room.update({
      where: { id },
      data: dto,
      select: ROOM_SELECT,
    });

    await this.activityLog.log({
      actorId: BigInt(user.id),
      action: 'room.updated',
      resourceType: 'ROOM',
      resourceId: id,
    });

    return updated;
  }

  async remove(id: bigint, user: AuthenticatedUser) {
    const room = await this.getActiveOrThrow(id);
    await this.assertOwnsPropertyOrAdmin(room.propertyId, user);

    // TODO: chặn xoá nếu còn Booking active tham chiếu Room này qua BookingItem —
    // sẽ bổ sung khi module booking (specs/booking.md) được triển khai.

    await this.prisma.room.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.activityLog.log({
      actorId: BigInt(user.id),
      action: 'room.deleted',
      resourceType: 'ROOM',
      resourceId: id,
    });
  }

  private async getActiveOrThrow(id: bigint) {
    const room = await this.prisma.room.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, propertyId: true },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    return room;
  }

  private async getActivePropertyOrThrow(propertyId: bigint) {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, deletedAt: null },
      select: { id: true, partnerId: true },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    return property;
  }

  private async assertOwnsPropertyOrAdmin(propertyId: bigint, user: AuthenticatedUser) {
    if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) {
      return this.getActivePropertyOrThrow(propertyId);
    }

    const property = await this.getActivePropertyOrThrow(propertyId);

    const partner = await this.prisma.partner.findFirst({
      where: { ownerId: BigInt(user.id), deletedAt: null },
      select: { id: true },
    });

    if (!partner || partner.id !== property.partnerId) {
      throw new ForbiddenException('You do not own this property');
    }

    return property;
  }
}
