import { Injectable } from '@nestjs/common';
import { Prisma, Room } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class RoomRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(where: Prisma.RoomWhereInput): Promise<Room[]> {
    return this.prisma.room.findMany({ where, orderBy: { createdAt: 'asc' } });
  }

  findById(id: bigint): Promise<Room | null> {
    return this.prisma.room.findFirst({ where: { id, deletedAt: null } });
  }

  create(data: Prisma.RoomCreateInput): Promise<Room> {
    return this.prisma.room.create({ data });
  }

  update(id: bigint, data: Prisma.RoomUpdateInput): Promise<Room> {
    return this.prisma.room.update({ where: { id }, data });
  }

  softDelete(id: bigint): Promise<Room> {
    return this.prisma.room.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
