import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PostRepository } from '../post/post.repository';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { NotificationService } from '../notification/notification.service';
import {
  buildPaginated,
  resolvePagination,
} from '../../shared/utils/pagination';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ListCommentsDto } from './dto/list-comments.dto';
import { ListCommentsModerationDto } from './dto/list-comments-moderation.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentRepository } from './comment.repository';

@Injectable()
export class CommentService {
  constructor(
    private readonly commentRepository: CommentRepository,
    private readonly postRepository: PostRepository,
    private readonly notificationService: NotificationService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async list(query: ListCommentsDto) {
    const postId = BigInt(query.postId);
    const { page, limit, skip, take } = resolvePagination(query);
    const [items, totalItems] = await this.commentRepository.findManyByPost(
      postId,
      skip,
      take,
    );
    return buildPaginated(items, totalItems, page, limit);
  }

  /** ADMIN — toan bo comment moi Post, de kiem duyet (mirror AircraftService.listForModeration). */
  async listForModeration(query: ListCommentsModerationDto) {
    const { page, limit, skip, take } = resolvePagination(query);
    const [items, totalItems] =
      await this.commentRepository.findManyForModeration(skip, take);
    return buildPaginated(items, totalItems, page, limit);
  }

  async create(userId: bigint, dto: CreateCommentDto) {
    const postId = BigInt(dto.postId);
    const post = await this.postRepository.findById(postId);
    if (!post) {
      throw new BadRequestException(`Post not found: ${dto.postId}`);
    }

    return this.commentRepository.create({
      content: dto.content,
      user: { connect: { id: userId } },
      post: { connect: { id: postId } },
    });
  }

  async update(userId: bigint, commentId: bigint, dto: UpdateCommentDto) {
    const comment = await this.getOwned(userId, commentId);
    return this.commentRepository.update(comment.id, {
      content: dto.content,
    });
  }

  /** Chu comment tu xoa, hoac Admin kiem duyet (an bang deletedAt, khong xoa cung, mirror Post/Review). */
  async remove(userId: bigint, role: Role, commentId: bigint) {
    const comment = await this.commentRepository.findById(commentId);
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    if (comment.userId !== userId && role !== Role.ADMIN) {
      throw new ForbiddenException('You do not own this comment');
    }
    await this.commentRepository.softDelete(comment.id);

    const isModeration = comment.userId !== userId && role === Role.ADMIN;
    if (isModeration) {
      await this.notificationService.notify(
        comment.userId,
        'Bình luận của bạn đã bị gỡ',
        'Một bình luận bạn viết đã bị quản trị viên gỡ bỏ do vi phạm quy định cộng đồng.',
      );

      await this.activityLogService.log({
        actorId: userId,
        actorRole: role,
        action: 'comment.moderationDelete',
        entityType: 'comment',
        entityId: comment.id,
        metadata: { ownerId: comment.userId.toString() },
      });
    }
  }

  private async getOwned(userId: bigint, commentId: bigint) {
    const comment = await this.commentRepository.findById(commentId);
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    if (comment.userId !== userId) {
      throw new ForbiddenException('You do not own this comment');
    }
    return comment;
  }
}
