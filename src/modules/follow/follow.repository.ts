import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

const FOLLOWED_USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  avatar: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class FollowRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Nhung nguoi userId dang theo doi. */
  findByFollower(followerId: bigint) {
    return this.prisma.follow.findMany({
      where: { followerId },
      orderBy: { createdAt: 'desc' },
      include: { following: { select: FOLLOWED_USER_SELECT } },
    });
  }

  /** Nhung nguoi dang theo doi userId. */
  findByFollowing(followingId: bigint) {
    return this.prisma.follow.findMany({
      where: { followingId },
      orderBy: { createdAt: 'desc' },
      include: { follower: { select: FOLLOWED_USER_SELECT } },
    });
  }

  findOne(followerId: bigint, followingId: bigint) {
    return this.prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
  }

  create(followerId: bigint, followingId: bigint) {
    return this.prisma.follow.create({ data: { followerId, followingId } });
  }

  async removeByFollowerAndFollowing(
    followerId: bigint,
    followingId: bigint,
  ): Promise<void> {
    await this.prisma.follow.deleteMany({ where: { followerId, followingId } });
  }
}
