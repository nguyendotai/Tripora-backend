import { BadRequestException, Injectable } from '@nestjs/common';
import { UserRepository } from '../user/user.repository';
import { FollowRepository } from './follow.repository';

@Injectable()
export class FollowService {
  constructor(
    private readonly followRepository: FollowRepository,
    private readonly userRepository: UserRepository,
  ) {}

  listFollowing(userId: bigint) {
    return this.followRepository.findByFollower(userId);
  }

  listFollowers(userId: bigint) {
    return this.followRepository.findByFollowing(userId);
  }

  async add(userId: bigint, rawFollowingId: string) {
    const followingId = BigInt(rawFollowingId);
    if (followingId === userId) {
      throw new BadRequestException('You cannot follow yourself');
    }

    const followingUser = await this.userRepository.findById(followingId);
    if (!followingUser) {
      throw new BadRequestException(`User not found: ${rawFollowingId}`);
    }

    const existing = await this.followRepository.findOne(userId, followingId);
    if (existing) {
      return existing;
    }

    return this.followRepository.create(userId, followingId);
  }

  async remove(userId: bigint, followingId: bigint) {
    await this.followRepository.removeByFollowerAndFollowing(
      userId,
      followingId,
    );
  }
}
