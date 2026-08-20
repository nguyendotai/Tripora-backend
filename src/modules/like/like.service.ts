import { BadRequestException, Injectable } from '@nestjs/common';
import { PostRepository } from '../post/post.repository';
import { LikeRepository } from './like.repository';

@Injectable()
export class LikeService {
  constructor(
    private readonly likeRepository: LikeRepository,
    private readonly postRepository: PostRepository,
  ) {}

  list(userId: bigint) {
    return this.likeRepository.findByUser(userId);
  }

  async add(userId: bigint, rawPostId: string) {
    const postId = BigInt(rawPostId);
    const post = await this.postRepository.findById(postId);
    if (!post) {
      throw new BadRequestException(`Post not found: ${rawPostId}`);
    }

    const existing = await this.likeRepository.findOne(userId, postId);
    if (existing) {
      return existing;
    }

    return this.likeRepository.create(userId, postId);
  }

  async remove(userId: bigint, postId: bigint) {
    await this.likeRepository.removeByUserAndPost(userId, postId);
  }
}
