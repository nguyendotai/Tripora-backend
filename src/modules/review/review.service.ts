import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProviderType, Role } from '@prisma/client';
import { BookingRepository } from '../booking/booking.repository';
import { DestinationRepository } from '../destination/destination.repository';
import { NotificationService } from '../notification/notification.service';
import { OrganizationMemberService } from '../provider/organization-member.service';
import { PropertyRepository } from '../property/property.repository';
import {
  buildPaginated,
  resolvePagination,
} from '../../shared/utils/pagination';
import { CreateReviewDto } from './dto/create-review.dto';
import { ListReviewsDto } from './dto/list-reviews.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewRepository } from './review.repository';

@Injectable()
export class ReviewService {
  constructor(
    private readonly reviewRepository: ReviewRepository,
    private readonly destinationRepository: DestinationRepository,
    private readonly propertyRepository: PropertyRepository,
    private readonly bookingRepository: BookingRepository,
    private readonly organizationMemberService: OrganizationMemberService,
    private readonly notificationService: NotificationService,
  ) {}

  async list(query: ListReviewsDto) {
    const { page, limit, skip, take } = resolvePagination(query);

    const where: Prisma.ReviewWhereInput = {
      deletedAt: null,
      ...(query.destinationId && {
        destinationId: BigInt(query.destinationId),
      }),
      ...(query.propertyId && { propertyId: BigInt(query.propertyId) }),
    };

    const [items, totalItems] = await this.reviewRepository.findMany(
      where,
      skip,
      take,
    );
    return buildPaginated(items, totalItems, page, limit);
  }

  /** V7 vong 10 — Provider tu xem Review cua toan bo Property minh so huu. Xem khong can permission
   * rieng, chi can la thanh vien to chuc (mirror PropertyService.getOwnedApprovedProvider — cung
   * nguyen tac "xem tai san cua to chuc minh khong can quyen manage"). */
  async listMineAsProvider(userId: bigint, query: ListReviewsDto) {
    const { provider } = await this.organizationMemberService.requireMembership(
      userId,
      { providerType: ProviderType.HOTEL },
    );
    const propertyIds = await this.propertyRepository.findIdsByProviderId(
      provider.id,
    );

    const { page, limit, skip, take } = resolvePagination(query);
    if (propertyIds.length === 0) {
      return buildPaginated([], 0, page, limit);
    }

    const where: Prisma.ReviewWhereInput = {
      deletedAt: null,
      propertyId: { in: propertyIds },
    };
    const [items, totalItems] = await this.reviewRepository.findMany(
      where,
      skip,
      take,
    );
    return buildPaginated(items, totalItems, page, limit);
  }

  async create(userId: bigint, dto: CreateReviewDto) {
    if (!!dto.destinationId === !!dto.propertyId) {
      throw new BadRequestException(
        'Provide exactly one of destinationId or propertyId',
      );
    }

    if (dto.propertyId) {
      return this.createForProperty(userId, BigInt(dto.propertyId), dto);
    }
    return this.createForDestination(userId, BigInt(dto.destinationId!), dto);
  }

  private async createForDestination(
    userId: bigint,
    destinationId: bigint,
    dto: CreateReviewDto,
  ) {
    const destination =
      await this.destinationRepository.findById(destinationId);
    if (!destination) {
      throw new BadRequestException(`Destination not found: ${destinationId}`);
    }

    const existing = await this.reviewRepository.findByUserAndDestination(
      userId,
      destinationId,
    );
    if (existing) {
      if (!existing.deletedAt) {
        throw new ConflictException(
          'You have already reviewed this destination',
        );
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

  /** V7 vong 9 — bat buoc phai co Booking CONFIRMED/COMPLETED cho dung Property nay moi duoc review,
   * khac han Destination (review tu do) — vi day la review "da mua", dang tin cay hon. */
  private async createForProperty(
    userId: bigint,
    propertyId: bigint,
    dto: CreateReviewDto,
  ) {
    const property = await this.propertyRepository.findById(propertyId);
    if (!property) {
      throw new BadRequestException(`Property not found: ${propertyId}`);
    }

    const hasBooked =
      await this.bookingRepository.hasConfirmedBookingForProperty(
        userId,
        propertyId,
      );
    if (!hasBooked) {
      throw new ForbiddenException(
        'You need a confirmed booking for this property before reviewing',
      );
    }

    const existing = await this.reviewRepository.findByUserAndProperty(
      userId,
      propertyId,
    );
    if (existing) {
      if (!existing.deletedAt) {
        throw new ConflictException('You have already reviewed this property');
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
      property: { connect: { id: propertyId } },
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

    const isModeration = review.userId !== userId && role === Role.ADMIN;
    if (isModeration) {
      await this.notificationService.notify(
        review.userId,
        'Đánh giá của bạn đã bị gỡ',
        'Một đánh giá bạn viết đã bị quản trị viên gỡ bỏ do vi phạm quy định cộng đồng.',
      );
    }
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
