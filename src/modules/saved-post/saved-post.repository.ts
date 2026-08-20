import { Injectable } from '@nestjs/common';
import { Prisma, SavedPost } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { POST_INCLUDE } from '../post/post.repository';

const SAVED_POST_INCLUDE = {
  post: { include: POST_INCLUDE },
} satisfies Prisma.SavedPostInclude;

@Injectable()
export class SavedPostRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUser(userId: bigint) {
    return this.prisma.savedPost.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: SAVED_POST_INCLUDE,
    });
  }

  findOne(userId: bigint, postId: bigint): Promise<SavedPost | null> {
    return this.prisma.savedPost.findUnique({
      where: { userId_postId: { userId, postId } },
    });
  }

  create(userId: bigint, postId: bigint): Promise<SavedPost> {
    return this.prisma.savedPost.create({ data: { userId, postId } });
  }

  async removeByUserAndPost(userId: bigint, postId: bigint): Promise<void> {
    await this.prisma.savedPost.deleteMany({ where: { userId, postId } });
  }
}
