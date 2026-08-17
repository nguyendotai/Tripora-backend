import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProviderType, TourStatus } from '@prisma/client';
import { OrganizationMemberService } from '../provider/organization-member.service';
import { TourRepository } from '../tour/tour.repository';
import { CreateTourItineraryDto } from './dto/create-tour-itinerary.dto';
import { UpdateTourItineraryDto } from './dto/update-tour-itinerary.dto';
import { TourItineraryRepository } from './tour-itinerary.repository';

@Injectable()
export class TourItineraryService {
  constructor(
    private readonly tourItineraryRepository: TourItineraryRepository,
    private readonly tourRepository: TourRepository,
    private readonly organizationMemberService: OrganizationMemberService,
  ) {}

  /** Public — chỉ khi Tour cha đã APPROVED. */
  async list(tourId: bigint) {
    const tour = await this.tourRepository.findById(tourId);
    if (!tour || tour.status !== TourStatus.APPROVED) {
      throw new NotFoundException('Tour not found');
    }

    const where: Prisma.TourItineraryWhereInput = { tourId };
    return this.tourItineraryRepository.findMany(where);
  }

  /** Tour Operator xem lịch trình của Tour mình, bất kể Tour đã duyệt hay chưa. */
  async listMine(userId: bigint, tourId: bigint) {
    await this.getOwnedTour(userId, tourId);

    const where: Prisma.TourItineraryWhereInput = { tourId };
    return this.tourItineraryRepository.findMany(where);
  }

  async create(userId: bigint, dto: CreateTourItineraryDto) {
    const tourId = BigInt(dto.tourId);
    await this.getOwnedTourForManage(userId, tourId);
    const dayNumber = await this.tourItineraryRepository.nextDayNumber(tourId);

    return this.tourItineraryRepository.create({
      dayNumber,
      title: dto.title,
      activities: dto.activities,
      meals: dto.meals,
      locations: dto.locations,
      tour: { connect: { id: tourId } },
    });
  }

  async update(
    userId: bigint,
    itineraryId: bigint,
    dto: UpdateTourItineraryDto,
  ) {
    const itinerary = await this.getOwnedItinerary(userId, itineraryId);

    return this.tourItineraryRepository.update(itinerary.id, {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.activities !== undefined && { activities: dto.activities }),
      ...(dto.meals !== undefined && { meals: dto.meals }),
      ...(dto.locations !== undefined && { locations: dto.locations }),
    });
  }

  async remove(userId: bigint, itineraryId: bigint) {
    const itinerary = await this.getOwnedItinerary(userId, itineraryId);
    await this.tourItineraryRepository.delete(itinerary.id);
  }

  private async getOwnedApprovedTourProviderForManage(userId: bigint) {
    const { provider } = await this.organizationMemberService.requireMembership(
      userId,
      {
        providerType: ProviderType.TOUR,
        permission: 'tour:manage',
      },
    );
    return provider;
  }

  private async getOwnedTour(userId: bigint, tourId: bigint) {
    const { provider } = await this.organizationMemberService.requireMembership(
      userId,
      {
        providerType: ProviderType.TOUR,
      },
    );
    const tour = await this.tourRepository.findById(tourId);
    if (!tour) {
      throw new NotFoundException('Tour not found');
    }
    if (tour.providerId !== provider.id) {
      throw new ForbiddenException('You do not own this tour');
    }
    return tour;
  }

  private async getOwnedTourForManage(userId: bigint, tourId: bigint) {
    const provider = await this.getOwnedApprovedTourProviderForManage(userId);
    const tour = await this.tourRepository.findById(tourId);
    if (!tour) {
      throw new NotFoundException('Tour not found');
    }
    if (tour.providerId !== provider.id) {
      throw new ForbiddenException('You do not own this tour');
    }
    return tour;
  }

  private async getOwnedItinerary(userId: bigint, itineraryId: bigint) {
    const itinerary = await this.tourItineraryRepository.findById(itineraryId);
    if (!itinerary) {
      throw new NotFoundException('Tour itinerary day not found');
    }
    await this.getOwnedTourForManage(userId, itinerary.tourId);
    return itinerary;
  }
}
