import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProviderType, TourStatus } from '@prisma/client';
import { OrganizationMemberService } from '../provider/organization-member.service';
import { TourRepository } from '../tour/tour.repository';
import { ListTourSchedulesDto } from './dto/list-tour-schedules.dto';
import { SetTourScheduleDto } from './dto/set-tour-schedule.dto';
import { TourScheduleRepository } from './tour-schedule.repository';

const MAX_RANGE_DAYS = 90;

@Injectable()
export class TourScheduleService {
  constructor(
    private readonly tourScheduleRepository: TourScheduleRepository,
    private readonly tourRepository: TourRepository,
    private readonly organizationMemberService: OrganizationMemberService,
  ) {}

  /** Public — chỉ khi Tour đã APPROVED. */
  async list(query: ListTourSchedulesDto) {
    const tourId = BigInt(query.tourId);
    const tour = await this.tourRepository.findById(tourId);
    if (!tour || tour.status !== TourStatus.APPROVED) {
      throw new NotFoundException('Tour not found');
    }

    const { startDate, endDate } = this.parseRange(
      query.startDate,
      query.endDate,
    );
    return this.tourScheduleRepository.findByTourAndDateRange(
      tourId,
      startDate,
      endDate,
    );
  }

  async listMine(userId: bigint, query: ListTourSchedulesDto) {
    const tourId = BigInt(query.tourId);
    await this.getOwnedTour(userId, tourId);

    const { startDate, endDate } = this.parseRange(
      query.startDate,
      query.endDate,
    );
    return this.tourScheduleRepository.findByTourAndDateRange(
      tourId,
      startDate,
      endDate,
    );
  }

  async set(userId: bigint, dto: SetTourScheduleDto) {
    const tourId = BigInt(dto.tourId);
    await this.getOwnedTourForManage(userId, tourId);

    const { startDate, endDate } = this.parseRange(dto.startDate, dto.endDate);
    const dayCount =
      Math.round(
        (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000),
      ) + 1;
    if (dayCount > MAX_RANGE_DAYS) {
      throw new BadRequestException(
        `Date range cannot exceed ${MAX_RANGE_DAYS} days`,
      );
    }

    const results = [];
    for (let i = 0; i < dayCount; i += 1) {
      const departureDate = new Date(startDate);
      departureDate.setUTCDate(departureDate.getUTCDate() + i);

      const existing = await this.tourScheduleRepository.findByTourAndDate(
        tourId,
        departureDate,
      );
      if (existing) {
        if (dto.capacity < existing.booked) {
          throw new BadRequestException(
            `Cannot set capacity below already-booked count (${existing.booked}) for ${departureDate.toISOString().slice(0, 10)}`,
          );
        }
        const updated = await this.tourScheduleRepository.update(existing.id, {
          capacity: dto.capacity,
          available: dto.capacity - existing.booked,
          price: dto.price,
        });
        results.push(updated);
      } else {
        const created = await this.tourScheduleRepository.create({
          tourId,
          departureDate,
          capacity: dto.capacity,
          available: dto.capacity,
          price: dto.price,
        });
        results.push(created);
      }
    }

    return results;
  }

  private parseRange(startDateRaw: string, endDateRaw: string) {
    const startDate = new Date(`${startDateRaw}T00:00:00.000Z`);
    const endDate = new Date(`${endDateRaw}T00:00:00.000Z`);
    if (startDate > endDate) {
      throw new BadRequestException(
        'startDate must be before or equal to endDate',
      );
    }
    return { startDate, endDate };
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
    const { provider } = await this.organizationMemberService.requireMembership(
      userId,
      {
        providerType: ProviderType.TOUR,
        permission: 'tour:manage',
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
}
