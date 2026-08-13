import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PropertyStatus, ProviderStatus, RoomStatus } from '@prisma/client';
import { PropertyRepository } from '../property/property.repository';
import { ProviderRepository } from '../provider/provider.repository';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { RoomRepository } from './room.repository';

@Injectable()
export class RoomService {
  constructor(
    private readonly roomRepository: RoomRepository,
    private readonly propertyRepository: PropertyRepository,
    private readonly providerRepository: ProviderRepository,
  ) {}

  /** Public — chỉ Room ACTIVE của 1 Property đã APPROVED. */
  async list(propertyId: bigint) {
    const property = await this.propertyRepository.findById(propertyId);
    if (!property || property.status !== PropertyStatus.APPROVED) {
      throw new NotFoundException('Property not found');
    }

    const where: Prisma.RoomWhereInput = {
      propertyId,
      deletedAt: null,
      status: RoomStatus.ACTIVE,
    };
    return this.roomRepository.findMany(where);
  }

  /** Provider xem toàn bộ Room của 1 Property mình sở hữu, bất kỳ status. */
  async listMine(userId: bigint, propertyId: bigint) {
    await this.getOwnedProperty(userId, propertyId);

    const where: Prisma.RoomWhereInput = { propertyId, deletedAt: null };
    return this.roomRepository.findMany(where);
  }

  async create(userId: bigint, dto: CreateRoomDto) {
    const propertyId = BigInt(dto.propertyId);
    await this.getOwnedProperty(userId, propertyId);

    return this.roomRepository.create({
      name: dto.name,
      description: dto.description,
      capacity: dto.capacity,
      beds: dto.beds,
      basePrice: dto.basePrice,
      currency: dto.currency ?? 'VND',
      amenities: dto.amenities,
      images: dto.images,
      property: { connect: { id: propertyId } },
    });
  }

  async update(userId: bigint, roomId: bigint, dto: UpdateRoomDto) {
    const room = await this.getOwnedRoom(userId, roomId);

    return this.roomRepository.update(room.id, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.capacity !== undefined && { capacity: dto.capacity }),
      ...(dto.beds !== undefined && { beds: dto.beds }),
      ...(dto.basePrice !== undefined && { basePrice: dto.basePrice }),
      ...(dto.currency !== undefined && { currency: dto.currency }),
      ...(dto.amenities !== undefined && { amenities: dto.amenities }),
      ...(dto.images !== undefined && { images: dto.images }),
      ...(dto.status !== undefined && { status: dto.status }),
    });
  }

  async remove(userId: bigint, roomId: bigint) {
    const room = await this.getOwnedRoom(userId, roomId);
    await this.roomRepository.softDelete(room.id);
  }

  private async getOwnedApprovedProvider(userId: bigint) {
    const provider = await this.providerRepository.findByUserId(userId);
    if (!provider || provider.status !== ProviderStatus.APPROVED) {
      throw new ForbiddenException('You need an approved provider profile to do this');
    }
    return provider;
  }

  private async getOwnedProperty(userId: bigint, propertyId: bigint) {
    const provider = await this.getOwnedApprovedProvider(userId);
    const property = await this.propertyRepository.findById(propertyId);
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    if (property.providerId !== provider.id) {
      throw new ForbiddenException('You do not own this property');
    }
    return property;
  }

  private async getOwnedRoom(userId: bigint, roomId: bigint) {
    const room = await this.roomRepository.findById(roomId);
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    await this.getOwnedProperty(userId, room.propertyId);
    return room;
  }
}
