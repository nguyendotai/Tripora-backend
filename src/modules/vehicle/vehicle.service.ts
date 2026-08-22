import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProviderType, VehicleStatus } from '@prisma/client';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { NotificationService } from '../notification/notification.service';
import { OrganizationMemberService } from '../provider/organization-member.service';
import { ProviderRepository } from '../provider/provider.repository';
import {
  buildPaginated,
  resolvePagination,
} from '../../shared/utils/pagination';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { ListVehiclesDto } from './dto/list-vehicles.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleRepository } from './vehicle.repository';

@Injectable()
export class VehicleService {
  constructor(
    private readonly vehicleRepository: VehicleRepository,
    private readonly providerRepository: ProviderRepository,
    private readonly organizationMemberService: OrganizationMemberService,
    private readonly notificationService: NotificationService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  /** Public — chỉ Vehicle đã APPROVED. */
  async list(query: ListVehiclesDto) {
    const { page, limit, skip, take } = resolvePagination(query);

    const where: Prisma.VehicleWhereInput = {
      deletedAt: null,
      status: VehicleStatus.APPROVED,
      ...(query.q && { name: { contains: query.q } }),
      ...(query.type && { type: query.type }),
    };

    const [items, totalItems] = await this.vehicleRepository.findMany(
      where,
      skip,
      take,
    );
    return buildPaginated(items, totalItems, page, limit);
  }

  async getById(id: bigint) {
    const vehicle = await this.vehicleRepository.findById(id);
    if (!vehicle || vehicle.status !== VehicleStatus.APPROVED) {
      throw new NotFoundException('Vehicle not found');
    }
    return vehicle;
  }

  /** Transportation Provider xem toàn bộ Vehicle của chính mình, bất kể status. */
  async listMine(userId: bigint, query: ListVehiclesDto) {
    const provider = await this.getOwnedApprovedTransportProvider(userId);
    const { page, limit, skip, take } = resolvePagination(query);

    const where: Prisma.VehicleWhereInput = {
      deletedAt: null,
      providerId: provider.id,
      ...(query.status && { status: query.status }),
    };

    const [items, totalItems] = await this.vehicleRepository.findMany(
      where,
      skip,
      take,
    );
    return buildPaginated(items, totalItems, page, limit);
  }

  /** Admin — xem toàn bộ Vehicle của mọi Provider, filter theo status. */
  async listForModeration(query: ListVehiclesDto) {
    const { page, limit, skip, take } = resolvePagination(query);

    const where: Prisma.VehicleWhereInput = {
      deletedAt: null,
      ...(query.status && { status: query.status }),
    };

    const [items, totalItems] = await this.vehicleRepository.findMany(
      where,
      skip,
      take,
    );
    return buildPaginated(items, totalItems, page, limit);
  }

  async create(userId: bigint, dto: CreateVehicleDto) {
    const provider =
      await this.getOwnedApprovedTransportProviderForManage(userId);
    await this.assertLicensePlateFree(dto.licensePlate);

    return this.vehicleRepository.create({
      type: dto.type,
      name: dto.name,
      model: dto.model,
      capacity: dto.capacity,
      features: dto.features,
      licensePlate: dto.licensePlate,
      images: dto.images,
      provider: { connect: { id: provider.id } },
    });
  }

  async update(userId: bigint, vehicleId: bigint, dto: UpdateVehicleDto) {
    const vehicle = await this.getOwnedVehicle(userId, vehicleId);

    if (
      dto.licensePlate !== undefined &&
      dto.licensePlate !== vehicle.licensePlate
    ) {
      await this.assertLicensePlateFree(dto.licensePlate);
    }

    return this.vehicleRepository.update(vehicle.id, {
      ...(dto.type !== undefined && { type: dto.type }),
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.model !== undefined && { model: dto.model }),
      ...(dto.capacity !== undefined && { capacity: dto.capacity }),
      ...(dto.features !== undefined && { features: dto.features }),
      ...(dto.licensePlate !== undefined && { licensePlate: dto.licensePlate }),
      ...(dto.images !== undefined && { images: dto.images }),
    });
  }

  async remove(userId: bigint, vehicleId: bigint) {
    const vehicle = await this.getOwnedVehicle(userId, vehicleId);
    await this.vehicleRepository.softDelete(vehicle.id);
  }

  async review(
    actorId: bigint,
    actorRole: string,
    id: bigint,
    status: 'APPROVED' | 'REJECTED',
    reason?: string,
  ) {
    const vehicle = await this.vehicleRepository.findById(id);
    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    const updated = await this.vehicleRepository.updateStatus(id, status);

    const provider = await this.providerRepository.findById(vehicle.providerId);
    if (provider) {
      const rejectMessage = reason
        ? `Xe "${vehicle.name}" của bạn đã bị từ chối. Lý do: ${reason}`
        : `Xe "${vehicle.name}" của bạn đã bị từ chối. Vui lòng liên hệ quản trị viên để biết thêm chi tiết.`;

      await this.notificationService.notify(
        provider.userId,
        status === 'APPROVED' ? 'Xe đã được duyệt' : 'Xe bị từ chối',
        status === 'APPROVED'
          ? `Xe "${vehicle.name}" của bạn đã được duyệt và hiển thị công khai.`
          : rejectMessage,
      );
    }

    await this.activityLogService.log({
      actorId,
      actorRole,
      action: 'vehicle.review',
      entityType: 'vehicle',
      entityId: id,
      reason,
      metadata: { status },
    });

    return updated;
  }

  private async assertLicensePlateFree(licensePlate: string) {
    const existing =
      await this.vehicleRepository.findByLicensePlate(licensePlate);
    if (existing) {
      throw new ConflictException(
        `License plate already registered: ${licensePlate}`,
      );
    }
  }

  /** Chỉ Provider type=TRANSPORT đã APPROVED mới quản lý Vehicle — tách domain với các loại đối tác khác. */
  private async getOwnedApprovedTransportProvider(userId: bigint) {
    const { provider } = await this.organizationMemberService.requireMembership(
      userId,
      {
        providerType: ProviderType.TRANSPORT,
      },
    );
    return provider;
  }

  private async getOwnedApprovedTransportProviderForManage(userId: bigint) {
    const { provider } = await this.organizationMemberService.requireMembership(
      userId,
      {
        providerType: ProviderType.TRANSPORT,
        permission: 'transport:manage',
      },
    );
    return provider;
  }

  private async getOwnedVehicle(userId: bigint, vehicleId: bigint) {
    const provider =
      await this.getOwnedApprovedTransportProviderForManage(userId);
    const vehicle = await this.vehicleRepository.findById(vehicleId);
    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }
    if (vehicle.providerId !== provider.id) {
      throw new ForbiddenException('You do not own this vehicle');
    }
    return vehicle;
  }
}
