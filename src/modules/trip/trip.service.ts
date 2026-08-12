import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DestinationRepository } from '../destination/destination.repository';
import { buildPaginated, resolvePagination } from '../../shared/utils/pagination';
import { CreateTripDayDto } from './dto/create-trip-day.dto';
import { CreateTripItemDto } from './dto/create-trip-item.dto';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripItemDto } from './dto/update-trip-item.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { TripRepository } from './trip.repository';

@Injectable()
export class TripService {
  constructor(
    private readonly tripRepository: TripRepository,
    private readonly destinationRepository: DestinationRepository,
  ) {}

  async list(userId: bigint, query: { page?: number; limit?: number }) {
    const { page, limit, skip, take } = resolvePagination(query);
    const [items, totalItems] = await this.tripRepository.findManyByUser(
      userId,
      skip,
      take,
    );
    return buildPaginated(items, totalItems, page, limit);
  }

  async getDetail(userId: bigint, tripId: bigint) {
    const trip = await this.tripRepository.findByIdWithDetail(tripId);
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }
    this.assertOwner(trip.userId, userId);
    return trip;
  }

  async create(userId: bigint, dto: CreateTripDto) {
    return this.tripRepository.create({
      title: dto.title,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      user: { connect: { id: userId } },
    });
  }

  async update(userId: bigint, tripId: bigint, dto: UpdateTripDto) {
    const trip = await this.getOwnedTrip(userId, tripId);
    return this.tripRepository.update(trip.id, {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.startDate !== undefined && { startDate: new Date(dto.startDate) }),
      ...(dto.endDate !== undefined && { endDate: new Date(dto.endDate) }),
    });
  }

  async remove(userId: bigint, tripId: bigint) {
    const trip = await this.getOwnedTrip(userId, tripId);
    await this.tripRepository.softDelete(trip.id);
  }

  async addDay(userId: bigint, tripId: bigint, dto: CreateTripDayDto) {
    const trip = await this.getOwnedTrip(userId, tripId);
    const dayNumber = await this.tripRepository.nextDayNumber(trip.id);

    return this.tripRepository.createDay({
      dayNumber,
      date: dto.date ? new Date(dto.date) : undefined,
      trip: { connect: { id: trip.id } },
    });
  }

  async removeDay(userId: bigint, tripId: bigint, dayId: bigint) {
    const day = await this.getOwnedDay(userId, tripId, dayId);
    await this.tripRepository.deleteDay(day.id);
  }

  async addItem(
    userId: bigint,
    tripId: bigint,
    dayId: bigint,
    dto: CreateTripItemDto,
  ) {
    const day = await this.getOwnedDay(userId, tripId, dayId);
    const destinationId = await this.resolveDestinationId(dto.destinationId);
    const sortOrder = await this.tripRepository.nextSortOrder(day.id);

    return this.tripRepository.createItem({
      title: dto.title,
      note: dto.note,
      sortOrder,
      tripDay: { connect: { id: day.id } },
      ...(destinationId !== undefined && {
        destination: { connect: { id: destinationId } },
      }),
    });
  }

  async updateItem(
    userId: bigint,
    tripId: bigint,
    dayId: bigint,
    itemId: bigint,
    dto: UpdateTripItemDto,
  ) {
    await this.getOwnedDay(userId, tripId, dayId);
    const item = await this.getOwnedItem(userId, tripId, dayId, itemId);
    const destinationId = await this.resolveDestinationId(dto.destinationId);

    return this.tripRepository.updateItem(item.id, {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.note !== undefined && { note: dto.note }),
      ...(destinationId !== undefined && {
        destination: { connect: { id: destinationId } },
      }),
    });
  }

  async removeItem(userId: bigint, tripId: bigint, dayId: bigint, itemId: bigint) {
    const item = await this.getOwnedItem(userId, tripId, dayId, itemId);
    await this.tripRepository.deleteItem(item.id);
  }

  async reorderItems(
    userId: bigint,
    tripId: bigint,
    dayId: bigint,
    itemIds: string[],
  ) {
    await this.getOwnedDay(userId, tripId, dayId);

    const ids = itemIds.map((id) => BigInt(id));
    for (const id of ids) {
      const item = await this.tripRepository.findItemById(id);
      if (!item || item.tripDayId !== dayId) {
        throw new BadRequestException(`Item ${id} does not belong to this day`);
      }
    }

    await this.tripRepository.reorderItems(ids);
  }

  private async getOwnedTrip(userId: bigint, tripId: bigint) {
    const trip = await this.tripRepository.findById(tripId);
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }
    this.assertOwner(trip.userId, userId);
    return trip;
  }

  private async getOwnedDay(userId: bigint, tripId: bigint, dayId: bigint) {
    const day = await this.tripRepository.findDayById(dayId);
    if (!day || day.tripId !== tripId) {
      throw new NotFoundException('Trip day not found');
    }
    this.assertOwner(day.trip.userId, userId);
    return day;
  }

  private async getOwnedItem(
    userId: bigint,
    tripId: bigint,
    dayId: bigint,
    itemId: bigint,
  ) {
    const item = await this.tripRepository.findItemById(itemId);
    if (!item || item.tripDayId !== dayId || item.tripDay.tripId !== tripId) {
      throw new NotFoundException('Trip item not found');
    }
    this.assertOwner(item.tripDay.trip.userId, userId);
    return item;
  }

  private assertOwner(ownerId: bigint, userId: bigint) {
    if (ownerId !== userId) {
      throw new ForbiddenException('You do not own this trip');
    }
  }

  private async resolveDestinationId(
    raw: string | undefined,
  ): Promise<bigint | undefined> {
    if (raw === undefined) return undefined;

    const destinationId = BigInt(raw);
    const destination = await this.destinationRepository.findById(destinationId);
    if (!destination) {
      throw new BadRequestException(`Destination not found: ${raw}`);
    }
    return destinationId;
  }
}
