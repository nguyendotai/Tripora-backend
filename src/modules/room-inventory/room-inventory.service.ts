import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Injectable,
} from '@nestjs/common';
import { PropertyStatus, RoomStatus } from '@prisma/client';
import { PropertyRepository } from '../property/property.repository';
import { OrganizationMemberService } from '../provider/organization-member.service';
import { RoomRepository } from '../room/room.repository';
import { ListRoomInventoryDto } from './dto/list-room-inventory.dto';
import { SetRoomInventoryDto } from './dto/set-room-inventory.dto';
import { RoomInventoryRepository } from './room-inventory.repository';

const MAX_RANGE_DAYS = 90;

@Injectable()
export class RoomInventoryService {
  constructor(
    private readonly roomInventoryRepository: RoomInventoryRepository,
    private readonly roomRepository: RoomRepository,
    private readonly propertyRepository: PropertyRepository,
    private readonly organizationMemberService: OrganizationMemberService,
  ) {}

  /** Public — chỉ khi Room ACTIVE va Property cha APPROVED. */
  async list(query: ListRoomInventoryDto) {
    const roomId = BigInt(query.roomId);
    const room = await this.roomRepository.findById(roomId);
    if (!room || room.status !== RoomStatus.ACTIVE) {
      throw new NotFoundException('Room not found');
    }
    const property = await this.propertyRepository.findById(room.propertyId);
    if (!property || property.status !== PropertyStatus.APPROVED) {
      throw new NotFoundException('Room not found');
    }

    const { startDate, endDate } = this.parseRange(
      query.startDate,
      query.endDate,
    );
    return this.roomInventoryRepository.findByRoomAndDateRange(
      roomId,
      startDate,
      endDate,
    );
  }

  async listMine(userId: bigint, query: ListRoomInventoryDto) {
    const roomId = BigInt(query.roomId);
    await this.getOwnedRoom(userId, roomId);

    const { startDate, endDate } = this.parseRange(
      query.startDate,
      query.endDate,
    );
    return this.roomInventoryRepository.findByRoomAndDateRange(
      roomId,
      startDate,
      endDate,
    );
  }

  async set(userId: bigint, dto: SetRoomInventoryDto) {
    const roomId = BigInt(dto.roomId);
    await this.getOwnedRoomForManage(userId, roomId);

    const { startDate, endDate } = this.parseRange(dto.startDate, dto.endDate);
    const dayCount =
      Math.round(
        (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000),
      ) + 1;
    if (dayCount > MAX_RANGE_DAYS) {
      throw new BadRequestException(
        `Date range cannot exceed ${MAX_RANGE_DAYS} days`,
      );
    }

    const results = [];
    for (let i = 0; i < dayCount; i += 1) {
      const date = new Date(startDate);
      date.setUTCDate(date.getUTCDate() + i);

      const existing = await this.roomInventoryRepository.findByRoomAndDate(
        roomId,
        date,
      );
      if (existing) {
        if (dto.totalRooms < existing.bookedRooms) {
          throw new BadRequestException(
            `Cannot set totalRooms below already-booked count (${existing.bookedRooms}) for ${date.toISOString().slice(0, 10)}`,
          );
        }
        const updated = await this.roomInventoryRepository.update(existing.id, {
          totalRooms: dto.totalRooms,
          availableRooms: dto.totalRooms - existing.bookedRooms,
          price: dto.price,
        });
        results.push(updated);
      } else {
        const created = await this.roomInventoryRepository.create({
          roomId,
          date,
          totalRooms: dto.totalRooms,
          availableRooms: dto.totalRooms,
          price: dto.price,
        });
        results.push(created);
      }
    }

    return results;
  }

  private parseRange(startDateRaw: string, endDateRaw: string) {
    const startDate = new Date(`${startDateRaw}T00:00:00.000Z`);
    const endDate = new Date(`${endDateRaw}T00:00:00.000Z`);
    if (startDate > endDate) {
      throw new BadRequestException(
        'startDate must be before or equal to endDate',
      );
    }
    return { startDate, endDate };
  }

  private async getOwnedApprovedProvider(userId: bigint) {
    const { provider } =
      await this.organizationMemberService.requireMembership(userId);
    return provider;
  }

  private async getOwnedApprovedProviderForManage(userId: bigint) {
    const { provider } = await this.organizationMemberService.requireMembership(
      userId,
      {
        permission: 'property:manage',
      },
    );
    return provider;
  }

  private async getOwnedRoom(userId: bigint, roomId: bigint) {
    const provider = await this.getOwnedApprovedProvider(userId);
    const room = await this.roomRepository.findById(roomId);
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    const property = await this.propertyRepository.findById(room.propertyId);
    if (!property || property.providerId !== provider.id) {
      throw new ForbiddenException('You do not own this room');
    }
    return room;
  }

  private async getOwnedRoomForManage(userId: bigint, roomId: bigint) {
    const provider = await this.getOwnedApprovedProviderForManage(userId);
    const room = await this.roomRepository.findById(roomId);
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    const property = await this.propertyRepository.findById(room.propertyId);
    if (!property || property.providerId !== provider.id) {
      throw new ForbiddenException('You do not own this room');
    }
    return room;
  }
}
