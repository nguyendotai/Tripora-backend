import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProviderType } from '@prisma/client';
import { NotificationService } from '../notification/notification.service';
import { OrganizationMemberService } from '../provider/organization-member.service';
import { ProviderRepository } from '../provider/provider.repository';
import {
  buildPaginated,
  resolvePagination,
} from '../../shared/utils/pagination';
import { AircraftRepository } from './aircraft.repository';
import { CreateAircraftDto } from './dto/create-aircraft.dto';
import { ListAircraftDto } from './dto/list-aircraft.dto';
import { UpdateAircraftDto } from './dto/update-aircraft.dto';

@Injectable()
export class AircraftService {
  constructor(
    private readonly aircraftRepository: AircraftRepository,
    private readonly providerRepository: ProviderRepository,
    private readonly organizationMemberService: OrganizationMemberService,
    private readonly notificationService: NotificationService,
  ) {}

  /** Airline Provider xem toàn bộ Aircraft của chính mình, bất kể status. */
  async listMine(userId: bigint, query: ListAircraftDto) {
    const provider = await this.getOwnedApprovedAirlineProvider(userId);
    const { page, limit, skip, take } = resolvePagination(query);

    const where: Prisma.AircraftWhereInput = {
      deletedAt: null,
      providerId: provider.id,
      ...(query.status && { status: query.status }),
    };

    const [items, totalItems] = await this.aircraftRepository.findMany(
      where,
      skip,
      take,
    );
    return buildPaginated(items, totalItems, page, limit);
  }

  /** Admin — xem toàn bộ Aircraft của mọi Airline Provider, filter theo status. */
  async listForModeration(query: ListAircraftDto) {
    const { page, limit, skip, take } = resolvePagination(query);

    const where: Prisma.AircraftWhereInput = {
      deletedAt: null,
      ...(query.status && { status: query.status }),
    };

    const [items, totalItems] = await this.aircraftRepository.findMany(
      where,
      skip,
      take,
    );
    return buildPaginated(items, totalItems, page, limit);
  }

  async create(userId: bigint, dto: CreateAircraftDto) {
    const provider =
      await this.getOwnedApprovedAirlineProviderForManage(userId);
    await this.assertRegistrationCodeFree(dto.registrationCode);

    return this.aircraftRepository.create({
      model: dto.model,
      registrationCode: dto.registrationCode,
      economyCapacity: dto.economyCapacity,
      businessCapacity: dto.businessCapacity ?? 0,
      provider: { connect: { id: provider.id } },
    });
  }

  async update(userId: bigint, aircraftId: bigint, dto: UpdateAircraftDto) {
    const aircraft = await this.getOwnedAircraft(userId, aircraftId);

    if (
      dto.registrationCode !== undefined &&
      dto.registrationCode !== aircraft.registrationCode
    ) {
      await this.assertRegistrationCodeFree(dto.registrationCode);
    }

    return this.aircraftRepository.update(aircraft.id, {
      ...(dto.model !== undefined && { model: dto.model }),
      ...(dto.registrationCode !== undefined && {
        registrationCode: dto.registrationCode,
      }),
      ...(dto.economyCapacity !== undefined && {
        economyCapacity: dto.economyCapacity,
      }),
      ...(dto.businessCapacity !== undefined && {
        businessCapacity: dto.businessCapacity,
      }),
    });
  }

  async remove(userId: bigint, aircraftId: bigint) {
    const aircraft = await this.getOwnedAircraft(userId, aircraftId);
    await this.aircraftRepository.softDelete(aircraft.id);
  }

  async review(id: bigint, status: 'APPROVED' | 'REJECTED', reason?: string) {
    const aircraft = await this.aircraftRepository.findById(id);
    if (!aircraft) {
      throw new NotFoundException('Aircraft not found');
    }

    const updated = await this.aircraftRepository.updateStatus(id, status);

    const provider = await this.providerRepository.findById(
      aircraft.providerId,
    );
    if (provider) {
      const rejectMessage = reason
        ? `Tàu bay "${aircraft.registrationCode}" của bạn đã bị từ chối. Lý do: ${reason}`
        : `Tàu bay "${aircraft.registrationCode}" của bạn đã bị từ chối. Vui lòng liên hệ quản trị viên để biết thêm chi tiết.`;

      await this.notificationService.notify(
        provider.userId,
        status === 'APPROVED' ? 'Tàu bay đã được duyệt' : 'Tàu bay bị từ chối',
        status === 'APPROVED'
          ? `Tàu bay "${aircraft.registrationCode}" của bạn đã được duyệt.`
          : rejectMessage,
      );
    }

    return updated;
  }

  private async assertRegistrationCodeFree(registrationCode: string) {
    const existing =
      await this.aircraftRepository.findByRegistrationCode(registrationCode);
    if (existing) {
      throw new ConflictException(
        `Registration code already exists: ${registrationCode}`,
      );
    }
  }

  /** Chỉ Provider type=FLIGHT đã APPROVED mới quản lý Aircraft — tách domain với các loại đối tác khác. */
  private async getOwnedApprovedAirlineProvider(userId: bigint) {
    const { provider } = await this.organizationMemberService.requireMembership(
      userId,
      {
        providerType: ProviderType.FLIGHT,
      },
    );
    return provider;
  }

  private async getOwnedApprovedAirlineProviderForManage(userId: bigint) {
    const { provider } = await this.organizationMemberService.requireMembership(
      userId,
      {
        providerType: ProviderType.FLIGHT,
        permission: 'flight:manage',
      },
    );
    return provider;
  }

  private async getOwnedAircraft(userId: bigint, aircraftId: bigint) {
    const provider =
      await this.getOwnedApprovedAirlineProviderForManage(userId);
    const aircraft = await this.aircraftRepository.findById(aircraftId);
    if (!aircraft) {
      throw new NotFoundException('Aircraft not found');
    }
    if (aircraft.providerId !== provider.id) {
      throw new ForbiddenException('You do not own this aircraft');
    }
    return aircraft;
  }
}
