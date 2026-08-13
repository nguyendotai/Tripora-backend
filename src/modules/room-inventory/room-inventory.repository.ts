import { Injectable } from '@nestjs/common';
import { RoomInventory } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class RoomInventoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByRoomAndDateRange(
    roomId: bigint,
    startDate: Date,
    endDate: Date,
  ): Promise<RoomInventory[]> {
    return this.prisma.roomInventory.findMany({
      where: { roomId, date: { gte: startDate, lte: endDate } },
      orderBy: { date: 'asc' },
    });
  }

  findByRoomAndDate(roomId: bigint, date: Date): Promise<RoomInventory | null> {
    return this.prisma.roomInventory.findUnique({
      where: { roomId_date: { roomId, date } },
    });
  }

  create(data: {
    roomId: bigint;
    date: Date;
    totalRooms: number;
    availableRooms: number;
    price?: number;
  }): Promise<RoomInventory> {
    return this.prisma.roomInventory.create({
      data: {
        date: data.date,
        totalRooms: data.totalRooms,
        availableRooms: data.availableRooms,
        price: data.price,
        room: { connect: { id: data.roomId } },
      },
    });
  }

  update(
    id: bigint,
    data: { totalRooms: number; availableRooms: number; price?: number },
  ): Promise<RoomInventory> {
    return this.prisma.roomInventory.update({
      where: { id },
      data: {
        totalRooms: data.totalRooms,
        availableRooms: data.availableRooms,
        ...(data.price !== undefined && { price: data.price }),
      },
    });
  }
}
