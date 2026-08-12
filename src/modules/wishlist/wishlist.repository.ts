import { Injectable } from '@nestjs/common';
import { WishlistItem } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class WishlistRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUser(userId: bigint): Promise<(WishlistItem & { destination: object })[]> {
    return this.prisma.wishlistItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { destination: true },
    });
  }

  findOne(userId: bigint, destinationId: bigint): Promise<WishlistItem | null> {
    return this.prisma.wishlistItem.findUnique({
      where: { userId_destinationId: { userId, destinationId } },
    });
  }

  create(userId: bigint, destinationId: bigint): Promise<WishlistItem> {
    return this.prisma.wishlistItem.create({ data: { userId, destinationId } });
  }

  async removeByUserAndDestination(userId: bigint, destinationId: bigint): Promise<void> {
    await this.prisma.wishlistItem.deleteMany({ where: { userId, destinationId } });
  }
}
