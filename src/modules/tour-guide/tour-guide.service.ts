import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProviderType } from '@prisma/client';
import { OrganizationMemberService } from '../provider/organization-member.service';
import { TourBookingRepository } from '../tour-booking/tour-booking.repository';
import { TourScheduleRepository } from '../tour-schedule/tour-schedule.repository';
import { TourRepository } from '../tour/tour.repository';
import { UserRepository } from '../user/user.repository';
import { AssignGuideDto } from './dto/assign-guide.dto';
import { CreateTourGuideDto } from './dto/create-tour-guide.dto';
import { UpdateMyGuideProfileDto } from './dto/update-my-guide-profile.dto';
import { UpdateTourGuideDto } from './dto/update-tour-guide.dto';
import { TourGuideRepository } from './tour-guide.repository';

@Injectable()
export class TourGuideService {
  constructor(
    private readonly tourGuideRepository: TourGuideRepository,
    private readonly organizationMemberService: OrganizationMemberService,
    private readonly userRepository: UserRepository,
    private readonly tourRepository: TourRepository,
    private readonly tourScheduleRepository: TourScheduleRepository,
    private readonly tourBookingRepository: TourBookingRepository,
  ) {}

  // ---------- Tour Operator ----------

  async create(userId: bigint, dto: CreateTourGuideDto) {
    const provider = await this.getOwnedApprovedTourProviderForManage(userId);

    const targetUser = await this.userRepository.findByEmail(dto.email);
    if (!targetUser) {
      throw new NotFoundException('No Tripora account found with this email');
    }

    const existing = await this.tourGuideRepository.findByUserId(targetUser.id);
    if (existing) {
      throw new ConflictException('This account is already a guide');
    }

    return this.tourGuideRepository.create({
      providerId: provider.id,
      userId: targetUser.id,
      bio: dto.bio,
      phone: dto.phone,
    });
  }

  async listMine(userId: bigint) {
    const provider = await this.getOwnedApprovedTourProvider(userId);
    return this.tourGuideRepository.findByProviderId(provider.id);
  }

  async update(userId: bigint, guideId: bigint, dto: UpdateTourGuideDto) {
    const guide = await this.getOwnedGuide(userId, guideId);
    return this.tourGuideRepository.update(guide.id, dto);
  }

  async remove(userId: bigint, guideId: bigint) {
    const guide = await this.getOwnedGuide(userId, guideId);
    await this.tourScheduleRepository.unassignGuideFromAll(guide.id);
    return this.tourGuideRepository.remove(guide.id);
  }

  /** Gan/go 1 Guide cho 1 ngay khoi hanh cu the — guideId rong = go phan cong. */
  async assign(userId: bigint, dto: AssignGuideDto) {
    const provider = await this.getOwnedApprovedTourProviderForManage(userId);

    const scheduleId = BigInt(dto.scheduleId);
    const schedule = await this.tourScheduleRepository.findById(scheduleId);
    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }
    const tour = await this.tourRepository.findById(schedule.tourId);
    if (!tour || tour.providerId !== provider.id) {
      throw new ForbiddenException('You do not own this schedule');
    }

    if (!dto.guideId) {
      return this.tourScheduleRepository.assignGuide(scheduleId, null);
    }

    const guideId = BigInt(dto.guideId);
    const guide = await this.tourGuideRepository.findById(guideId);
    if (!guide || guide.providerId !== provider.id) {
      throw new NotFoundException('Guide not found');
    }

    return this.tourScheduleRepository.assignGuide(scheduleId, guideId);
  }

  // ---------- Guide ----------

  async getMe(userId: bigint) {
    const guide = await this.tourGuideRepository.findByUserId(userId);
    if (!guide) {
      throw new NotFoundException('You do not have a guide profile');
    }
    return guide;
  }

  async updateMe(userId: bigint, dto: UpdateMyGuideProfileDto) {
    const guide = await this.getMe(userId);
    return this.tourGuideRepository.update(guide.id, dto);
  }

  async listMySchedules(userId: bigint) {
    const guide = await this.getMe(userId);
    return this.tourScheduleRepository.findByGuideId(guide.id);
  }

  async listTravelers(userId: bigint, scheduleId: bigint) {
    const guide = await this.getMe(userId);
    const schedule = await this.tourScheduleRepository.findById(scheduleId);
    if (!schedule || schedule.guideId !== guide.id) {
      throw new ForbiddenException('You are not assigned to this schedule');
    }
    return this.tourBookingRepository.findManyByTourAndDate(
      schedule.tourId,
      schedule.departureDate,
    );
  }

  // ---------- Helpers ----------

  private async getOwnedApprovedTourProvider(userId: bigint) {
    const { provider } = await this.organizationMemberService.requireMembership(
      userId,
      {
        providerType: ProviderType.TOUR,
      },
    );
    return provider;
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

  private async getOwnedGuide(userId: bigint, guideId: bigint) {
    const provider = await this.getOwnedApprovedTourProviderForManage(userId);
    const guide = await this.tourGuideRepository.findById(guideId);
    if (!guide) {
      throw new NotFoundException('Guide not found');
    }
    if (guide.providerId !== provider.id) {
      throw new ForbiddenException('You do not own this guide');
    }
    return guide;
  }
}
