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
import { ActivityLogService } from '../activity-log/activity-log.service';
import { ExperienceRepository } from '../experience/experience.repository';
import { ExperienceBookingRepository } from '../experience-booking/experience-booking.repository';
import { FlightRepository } from '../flight/flight.repository';
import { FlightBookingRepository } from '../flight-booking/flight-booking.repository';
import { NotificationService } from '../notification/notification.service';
import { OrganizationMemberService } from '../provider/organization-member.service';
import { PropertyRepository } from '../property/property.repository';
import { TourRepository } from '../tour/tour.repository';
import { TourBookingRepository } from '../tour-booking/tour-booking.repository';
import {
  buildPaginated,
  clampLimit,
  resolvePagination,
} from '../../shared/utils/pagination';
import { CreateReviewDto } from './dto/create-review.dto';
import { ListReviewHighlightsDto } from './dto/list-review-highlights.dto';
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
    private readonly tourRepository: TourRepository,
    private readonly tourBookingRepository: TourBookingRepository,
    private readonly experienceRepository: ExperienceRepository,
    private readonly experienceBookingRepository: ExperienceBookingRepository,
    private readonly flightRepository: FlightRepository,
    private readonly flightBookingRepository: FlightBookingRepository,
    private readonly organizationMemberService: OrganizationMemberService,
    private readonly notificationService: NotificationService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  /** Public — Home page "Danh gia tu khach hang". Khong phan trang, chi tra top N. */
  listHighlights(query: ListReviewHighlightsDto) {
    const limit = clampLimit(query.limit, 6, 12);
    return this.reviewRepository.findHighlights(limit);
  }

  async list(query: ListReviewsDto) {
    const { page, limit, skip, take } = resolvePagination(query);

    const where: Prisma.ReviewWhereInput = {
      deletedAt: null,
      ...(query.destinationId && {
        destinationId: BigInt(query.destinationId),
      }),
      ...(query.propertyId && { propertyId: BigInt(query.propertyId) }),
      ...(query.tourId && { tourId: BigInt(query.tourId) }),
      ...(query.experienceId && { experienceId: BigInt(query.experienceId) }),
      ...(query.flightId && { flightId: BigInt(query.flightId) }),
    };

    const [items, totalItems] = await this.reviewRepository.findMany(
      where,
      skip,
      take,
    );
    return buildPaginated(items, totalItems, page, limit);
  }

  /** V7 vong 10 — Provider tu xem Review cua toan bo san pham minh so huu. Xem khong can permission
   * rieng, chi can la thanh vien to chuc (mirror PropertyService.getOwnedApprovedProvider — cung
   * nguyen tac "xem tai san cua to chuc minh khong can quyen manage").
   * V7 vong 12 — tong quat hoa tu chi Hotel sang ca Tour/Experience/Flight, dispatch theo
   * provider.type. Khong truyen providerType filter cho requireMembership (chap nhan moi Provider
   * APPROVED), roi tu switch loai bo Transport ro rang (Review chua co cot vehicleId/routeId). */
  async listMineAsProvider(userId: bigint, query: ListReviewsDto) {
    const { provider } = await this.organizationMemberService.requireMembership(
      userId,
      {},
    );

    let targetIds: bigint[];
    let where: Prisma.ReviewWhereInput;
    switch (provider.type) {
      case ProviderType.TOUR: {
        targetIds = await this.tourRepository.findIdsByProviderId(provider.id);
        where = { deletedAt: null, tourId: { in: targetIds } };
        break;
      }
      case ProviderType.ACTIVITY: {
        targetIds = await this.experienceRepository.findIdsByProviderId(
          provider.id,
        );
        where = { deletedAt: null, experienceId: { in: targetIds } };
        break;
      }
      case ProviderType.FLIGHT: {
        targetIds = await this.flightRepository.findIdsByProviderId(
          provider.id,
        );
        where = { deletedAt: null, flightId: { in: targetIds } };
        break;
      }
      case ProviderType.HOTEL: {
        targetIds = await this.propertyRepository.findIdsByProviderId(
          provider.id,
        );
        where = { deletedAt: null, propertyId: { in: targetIds } };
        break;
      }
      default: {
        throw new ForbiddenException(
          'Reviews are not available for this provider type yet',
        );
      }
    }

    const { page, limit, skip, take } = resolvePagination(query);
    if (targetIds.length === 0) {
      return buildPaginated([], 0, page, limit);
    }

    const [items, totalItems] = await this.reviewRepository.findMany(
      where,
      skip,
      take,
    );
    return buildPaginated(items, totalItems, page, limit);
  }

  async create(userId: bigint, dto: CreateReviewDto) {
    const targets = [
      dto.destinationId,
      dto.propertyId,
      dto.tourId,
      dto.experienceId,
      dto.flightId,
    ];
    if (targets.filter(Boolean).length !== 1) {
      throw new BadRequestException(
        'Provide exactly one of destinationId, propertyId, tourId, experienceId, or flightId',
      );
    }

    if (dto.propertyId) {
      return this.createForProperty(userId, BigInt(dto.propertyId), dto);
    }
    if (dto.tourId) {
      return this.createForTour(userId, BigInt(dto.tourId), dto);
    }
    if (dto.experienceId) {
      return this.createForExperience(userId, BigInt(dto.experienceId), dto);
    }
    if (dto.flightId) {
      return this.createForFlight(userId, BigInt(dto.flightId), dto);
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

  /** V7 vong 12 — mirror y het createForProperty, doi sang Tour + hasConfirmedBookingForTour. */
  private async createForTour(
    userId: bigint,
    tourId: bigint,
    dto: CreateReviewDto,
  ) {
    const tour = await this.tourRepository.findById(tourId);
    if (!tour) {
      throw new BadRequestException(`Tour not found: ${tourId}`);
    }

    const hasBooked =
      await this.tourBookingRepository.hasConfirmedBookingForTour(
        userId,
        tourId,
      );
    if (!hasBooked) {
      throw new ForbiddenException(
        'You need a confirmed booking for this tour before reviewing',
      );
    }

    const existing = await this.reviewRepository.findByUserAndTour(
      userId,
      tourId,
    );
    if (existing) {
      if (!existing.deletedAt) {
        throw new ConflictException('You have already reviewed this tour');
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
      tour: { connect: { id: tourId } },
    });
  }

  /** V7 vong 12 — mirror y het createForProperty, doi sang Experience + hasConfirmedBookingForExperience. */
  private async createForExperience(
    userId: bigint,
    experienceId: bigint,
    dto: CreateReviewDto,
  ) {
    const experience = await this.experienceRepository.findById(experienceId);
    if (!experience) {
      throw new BadRequestException(`Experience not found: ${experienceId}`);
    }

    const hasBooked =
      await this.experienceBookingRepository.hasConfirmedBookingForExperience(
        userId,
        experienceId,
      );
    if (!hasBooked) {
      throw new ForbiddenException(
        'You need a confirmed booking for this experience before reviewing',
      );
    }

    const existing = await this.reviewRepository.findByUserAndExperience(
      userId,
      experienceId,
    );
    if (existing) {
      if (!existing.deletedAt) {
        throw new ConflictException(
          'You have already reviewed this experience',
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
      experience: { connect: { id: experienceId } },
    });
  }

  /** V7 vong 12 — mirror y het createForProperty, doi sang Flight + hasConfirmedBookingForFlight. */
  private async createForFlight(
    userId: bigint,
    flightId: bigint,
    dto: CreateReviewDto,
  ) {
    const flight = await this.flightRepository.findById(flightId);
    if (!flight) {
      throw new BadRequestException(`Flight not found: ${flightId}`);
    }

    const hasBooked =
      await this.flightBookingRepository.hasConfirmedBookingForFlight(
        userId,
        flightId,
      );
    if (!hasBooked) {
      throw new ForbiddenException(
        'You need a confirmed booking for this flight before reviewing',
      );
    }

    const existing = await this.reviewRepository.findByUserAndFlight(
      userId,
      flightId,
    );
    if (existing) {
      if (!existing.deletedAt) {
        throw new ConflictException('You have already reviewed this flight');
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
      flight: { connect: { id: flightId } },
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

      await this.activityLogService.log({
        actorId: userId,
        actorRole: role,
        action: 'review.moderationDelete',
        entityType: 'review',
        entityId: review.id,
        metadata: { ownerId: review.userId.toString() },
      });
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
