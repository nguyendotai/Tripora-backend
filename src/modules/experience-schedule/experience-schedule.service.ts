import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ExperienceStatus, ProviderType } from '@prisma/client';
import { ExperienceRepository } from '../experience/experience.repository';
import { OrganizationMemberService } from '../provider/organization-member.service';
import { ListExperienceSchedulesDto } from './dto/list-experience-schedules.dto';
import { SetExperienceScheduleDto } from './dto/set-experience-schedule.dto';
import { ExperienceScheduleRepository } from './experience-schedule.repository';

const MAX_RANGE_DAYS = 90;

@Injectable()
export class ExperienceScheduleService {
  constructor(
    private readonly experienceScheduleRepository: ExperienceScheduleRepository,
    private readonly experienceRepository: ExperienceRepository,
    private readonly organizationMemberService: OrganizationMemberService,
  ) {}

  /** Public — chỉ khi Experience đã APPROVED. */
  async list(query: ListExperienceSchedulesDto) {
    const experienceId = BigInt(query.experienceId);
    const experience = await this.experienceRepository.findById(experienceId);
    if (!experience || experience.status !== ExperienceStatus.APPROVED) {
      throw new NotFoundException('Experience not found');
    }

    const { startDate, endDate } = this.parseRange(
      query.startDate,
      query.endDate,
    );
    return this.experienceScheduleRepository.findByExperienceAndDateRange(
      experienceId,
      startDate,
      endDate,
    );
  }

  async listMine(userId: bigint, query: ListExperienceSchedulesDto) {
    const experienceId = BigInt(query.experienceId);
    await this.getOwnedExperience(userId, experienceId);

    const { startDate, endDate } = this.parseRange(
      query.startDate,
      query.endDate,
    );
    return this.experienceScheduleRepository.findByExperienceAndDateRange(
      experienceId,
      startDate,
      endDate,
    );
  }

  async set(userId: bigint, dto: SetExperienceScheduleDto) {
    const experienceId = BigInt(dto.experienceId);
    await this.getOwnedExperienceForManage(userId, experienceId);

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

      const existing =
        await this.experienceScheduleRepository.findByExperienceAndDate(
          experienceId,
          departureDate,
        );
      if (existing) {
        if (dto.capacity < existing.booked) {
          throw new BadRequestException(
            `Cannot set capacity below already-booked count (${existing.booked}) for ${departureDate.toISOString().slice(0, 10)}`,
          );
        }
        const updated = await this.experienceScheduleRepository.update(
          existing.id,
          {
            capacity: dto.capacity,
            available: dto.capacity - existing.booked,
            price: dto.price,
          },
        );
        results.push(updated);
      } else {
        const created = await this.experienceScheduleRepository.create({
          experienceId,
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

  private async getOwnedExperience(userId: bigint, experienceId: bigint) {
    const { provider } = await this.organizationMemberService.requireMembership(
      userId,
      {
        providerType: ProviderType.ACTIVITY,
      },
    );
    const experience = await this.experienceRepository.findById(experienceId);
    if (!experience) {
      throw new NotFoundException('Experience not found');
    }
    if (experience.providerId !== provider.id) {
      throw new ForbiddenException('You do not own this experience');
    }
    return experience;
  }

  private async getOwnedExperienceForManage(
    userId: bigint,
    experienceId: bigint,
  ) {
    const { provider } = await this.organizationMemberService.requireMembership(
      userId,
      {
        providerType: ProviderType.ACTIVITY,
        permission: 'experience:manage',
      },
    );
    const experience = await this.experienceRepository.findById(experienceId);
    if (!experience) {
      throw new NotFoundException('Experience not found');
    }
    if (experience.providerId !== provider.id) {
      throw new ForbiddenException('You do not own this experience');
    }
    return experience;
  }
}
