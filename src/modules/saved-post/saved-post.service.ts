import { BadRequestException, Injectable } from '@nestjs/common';
import { PostRepository } from '../post/post.repository';
import { SavedPostRepository } from './saved-post.repository';

@Injectable()
export class SavedPostService {
  constructor(
    private readonly savedPostRepository: SavedPostRepository,
    private readonly postRepository: PostRepository,
  ) {}

  list(userId: bigint) {
    return this.savedPostRepository.findByUser(userId);
  }

  async add(userId: bigint, rawPostId: string) {
    const postId = BigInt(rawPostId);
    const post = await this.postRepository.findById(postId);
    if (!post) {
      throw new BadRequestException(`Post not found: ${rawPostId}`);
    }

    const existing = await this.savedPostRepository.findOne(userId, postId);
    if (existing) {
      return existing;
    }

    return this.savedPostRepository.create(userId, postId);
  }

  async remove(userId: bigint, postId: bigint) {
    await this.savedPostRepository.removeByUserAndPost(userId, postId);
  }
}
