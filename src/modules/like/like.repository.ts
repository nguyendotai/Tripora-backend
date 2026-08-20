import { Injectable } from '@nestjs/common';
import { Like } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class LikeRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUser(userId: bigint): Promise<Like[]> {
    return this.prisma.like.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(userId: bigint, postId: bigint): Promise<Like | null> {
    return this.prisma.like.findUnique({
      where: { userId_postId: { userId, postId } },
    });
  }

  create(userId: bigint, postId: bigint): Promise<Like> {
    return this.prisma.like.create({ data: { userId, postId } });
  }

  async removeByUserAndPost(userId: bigint, postId: bigint): Promise<void> {
    await this.prisma.like.deleteMany({ where: { userId, postId } });
  }
}
