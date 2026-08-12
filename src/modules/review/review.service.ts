import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { DestinationRepository } from '../destination/destination.repository';
import { buildPaginated, resolvePagination } from '../../shared/utils/pagination';
import { CreateReviewDto } from './dto/create-review.dto';
import { ListReviewsDto } from './dto/list-reviews.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewRepository } from './review.repository';

@Injectable()
export class ReviewService {
  constructor(
    private readonly reviewRepository: ReviewRepository,
    private readonly destinationRepository: DestinationRepository,
  ) {}

  async list(query: ListReviewsDto) {
    const { page, limit, skip, take } = resolvePagination(query);

    const where: Prisma.ReviewWhereInput = {
      deletedAt: null,
      ...(query.destinationId && { destinationId: BigInt(query.destinationId) }),
    };

    const [items, totalItems] = await this.reviewRepository.findMany(where, skip, take);
    return buildPaginated(items, totalItems, page, limit);
  }

  async create(userId: bigint, dto: CreateReviewDto) {
    const destinationId = BigInt(dto.destinationId);
    const destination = await this.destinationRepository.findById(destinationId);
    if (!destination) {
      throw new BadRequestException(`Destination not found: ${dto.destinationId}`);
    }

    const existing = await this.reviewRepository.findByUserAndDestination(
      userId,
      destinationId,
    );
    if (existing) {
      if (!existing.deletedAt) {
        throw new ConflictException('You have already reviewed this destination');
      }
      return this.reviewRepository.update(existing.id, {
        rating: dto.rating,
        content: dto.content,
        deletedAt: null,
      });
    }

    return this.reviewRepository.create({
      rating: dto.rating,
      content: dto.content,
      user: { connect: { id: userId } },
      destination: { connect: { id: destinationId } },
    });
  }

  async update(userId: bigint, reviewId: bigint, dto: UpdateReviewDto) {
    const review = await this.getOwned(userId, reviewId);
    return this.reviewRepository.update(review.id, {
      ...(dto.rating !== undefined && { rating: dto.rating }),
      ...(dto.content !== undefined && { content: dto.content }),
    });
  }

  async remove(userId: bigint, role: Role, reviewId: bigint) {
    const review = await this.reviewRepository.findById(reviewId);
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    if (review.userId !== userId && role !== Role.ADMIN) {
      throw new ForbiddenException('You do not own this review');
    }
    await this.reviewRepository.softDelete(review.id);
  }

  private async getOwned(userId: bigint, reviewId: bigint) {
    const review = await this.reviewRepository.findById(reviewId);
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    if (review.userId !== userId) {
      throw new ForbiddenException('You do not own this review');
    }
    return review;
  }
}
