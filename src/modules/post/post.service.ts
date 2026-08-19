import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { DestinationRepository } from '../destination/destination.repository';
import { NotificationService } from '../notification/notification.service';
import {
  buildPaginated,
  resolvePagination,
} from '../../shared/utils/pagination';
import { CreatePostDto } from './dto/create-post.dto';
import { ListPostsDto } from './dto/list-posts.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostRepository } from './post.repository';

@Injectable()
export class PostService {
  constructor(
    private readonly postRepository: PostRepository,
    private readonly destinationRepository: DestinationRepository,
    private readonly notificationService: NotificationService,
  ) {}

  /** Public — Travel Community feed, moi nguoi xem duoc, moi nhat truoc. */
  async list(query: ListPostsDto) {
    const { page, limit, skip, take } = resolvePagination(query);
    const where: Prisma.PostWhereInput = {
      deletedAt: null,
      ...(query.destinationId && {
        destinationId: BigInt(query.destinationId),
      }),
    };
    const [items, totalItems] = await this.postRepository.findMany(
      where,
      skip,
      take,
    );
    return buildPaginated(items, totalItems, page, limit);
  }

  /** Bai viet cua chinh minh, ke ca de quan ly/xoa sau nay. */
  async listMine(userId: bigint, query: ListPostsDto) {
    const { page, limit, skip, take } = resolvePagination(query);
    const where: Prisma.PostWhereInput = { deletedAt: null, userId };
    const [items, totalItems] = await this.postRepository.findMany(
      where,
      skip,
      take,
    );
    return buildPaginated(items, totalItems, page, limit);
  }

  async getById(id: bigint) {
    const post = await this.postRepository.findById(id);
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    return post;
  }

  async create(userId: bigint, dto: CreatePostDto) {
    if (dto.destinationId) {
      const destination = await this.destinationRepository.findById(
        BigInt(dto.destinationId),
      );
      if (!destination) {
        throw new BadRequestException(
          `Destination not found: ${dto.destinationId}`,
        );
      }
    }

    return this.postRepository.create({
      caption: dto.caption,
      images: dto.images,
      user: { connect: { id: userId } },
      ...(dto.destinationId && {
        destination: { connect: { id: BigInt(dto.destinationId) } },
      }),
    });
  }

  async update(userId: bigint, postId: bigint, dto: UpdatePostDto) {
    const post = await this.getOwned(userId, postId);
    return this.postRepository.update(post.id, {
      ...(dto.caption !== undefined && { caption: dto.caption }),
      ...(dto.images !== undefined && { images: dto.images }),
    });
  }

  /** Owner tu xoa bai cua minh, hoac Admin kiem duyet (an bang deletedAt, khong xoa cung). */
  async remove(userId: bigint, role: Role, postId: bigint) {
    const post = await this.postRepository.findById(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    if (post.userId !== userId && role !== Role.ADMIN) {
      throw new ForbiddenException('You do not own this post');
    }
    await this.postRepository.softDelete(post.id);

    const isModeration = post.userId !== userId && role === Role.ADMIN;
    if (isModeration) {
      await this.notificationService.notify(
        post.userId,
        'Bài viết của bạn đã bị gỡ',
        'Một bài viết bạn đăng đã bị quản trị viên gỡ bỏ do vi phạm quy định cộng đồng.',
      );
    }
  }

  private async getOwned(userId: bigint, postId: bigint) {
    const post = await this.postRepository.findById(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    if (post.userId !== userId) {
      throw new ForbiddenException('You do not own this post');
    }
    return post;
  }
}
