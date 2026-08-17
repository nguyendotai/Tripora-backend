import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProviderType, TransportRouteStatus } from '@prisma/client';
import { NotificationService } from '../notification/notification.service';
import { OrganizationMemberService } from '../provider/organization-member.service';
import { ProviderRepository } from '../provider/provider.repository';
import {
  buildPaginated,
  resolvePagination,
} from '../../shared/utils/pagination';
import { CreateTransportRouteDto } from './dto/create-transport-route.dto';
import { ListTransportRoutesDto } from './dto/list-transport-routes.dto';
import { UpdateTransportRouteDto } from './dto/update-transport-route.dto';
import { TransportRouteRepository } from './transport-route.repository';

@Injectable()
export class TransportRouteService {
  constructor(
    private readonly transportRouteRepository: TransportRouteRepository,
    private readonly providerRepository: ProviderRepository,
    private readonly organizationMemberService: OrganizationMemberService,
    private readonly notificationService: NotificationService,
  ) {}

  /** Public — chỉ Route đã APPROVED. Khách tìm theo origin/destination trước khi chọn Vehicle. */
  async list(query: ListTransportRoutesDto) {
    const { page, limit, skip, take } = resolvePagination(query);

    const where: Prisma.TransportRouteWhereInput = {
      deletedAt: null,
      status: TransportRouteStatus.APPROVED,
      ...(query.origin && { origin: { contains: query.origin } }),
      ...(query.destination && {
        destination: { contains: query.destination },
      }),
      ...(query.vehicleType && { vehicleType: query.vehicleType }),
    };

    const [items, totalItems] = await this.transportRouteRepository.findMany(
      where,
      skip,
      take,
    );
    return buildPaginated(items, totalItems, page, limit);
  }

  async getById(id: bigint) {
    const route = await this.transportRouteRepository.findById(id);
    if (!route || route.status !== TransportRouteStatus.APPROVED) {
      throw new NotFoundException('Transport route not found');
    }
    return route;
  }

  async listMine(userId: bigint, query: ListTransportRoutesDto) {
    const provider = await this.getOwnedApprovedTransportProvider(userId);
    const { page, limit, skip, take } = resolvePagination(query);

    const where: Prisma.TransportRouteWhereInput = {
      deletedAt: null,
      providerId: provider.id,
      ...(query.status && { status: query.status }),
    };

    const [items, totalItems] = await this.transportRouteRepository.findMany(
      where,
      skip,
      take,
    );
    return buildPaginated(items, totalItems, page, limit);
  }

  async listForModeration(query: ListTransportRoutesDto) {
    const { page, limit, skip, take } = resolvePagination(query);

    const where: Prisma.TransportRouteWhereInput = {
      deletedAt: null,
      ...(query.status && { status: query.status }),
    };

    const [items, totalItems] = await this.transportRouteRepository.findMany(
      where,
      skip,
      take,
    );
    return buildPaginated(items, totalItems, page, limit);
  }

  async create(userId: bigint, dto: CreateTransportRouteDto) {
    const provider =
      await this.getOwnedApprovedTransportProviderForManage(userId);

    return this.transportRouteRepository.create({
      origin: dto.origin,
      destination: dto.destination,
      vehicleType: dto.vehicleType,
      price: dto.price,
      estimatedDuration: dto.estimatedDuration,
      provider: { connect: { id: provider.id } },
    });
  }

  async update(userId: bigint, routeId: bigint, dto: UpdateTransportRouteDto) {
    const route = await this.getOwnedRoute(userId, routeId);

    return this.transportRouteRepository.update(route.id, {
      ...(dto.origin !== undefined && { origin: dto.origin }),
      ...(dto.destination !== undefined && { destination: dto.destination }),
      ...(dto.vehicleType !== undefined && { vehicleType: dto.vehicleType }),
      ...(dto.price !== undefined && { price: dto.price }),
      ...(dto.estimatedDuration !== undefined && {
        estimatedDuration: dto.estimatedDuration,
      }),
    });
  }

  async remove(userId: bigint, routeId: bigint) {
    const route = await this.getOwnedRoute(userId, routeId);
    await this.transportRouteRepository.softDelete(route.id);
  }

  async review(id: bigint, status: 'APPROVED' | 'REJECTED', reason?: string) {
    const route = await this.transportRouteRepository.findById(id);
    if (!route) {
      throw new NotFoundException('Transport route not found');
    }

    const updated = await this.transportRouteRepository.updateStatus(
      id,
      status,
    );

    const provider = await this.providerRepository.findById(route.providerId);
    if (provider) {
      const rejectMessage = reason
        ? `Tuyến "${route.origin} → ${route.destination}" của bạn đã bị từ chối. Lý do: ${reason}`
        : `Tuyến "${route.origin} → ${route.destination}" của bạn đã bị từ chối. Vui lòng liên hệ quản trị viên để biết thêm chi tiết.`;

      await this.notificationService.notify(
        provider.userId,
        status === 'APPROVED'
          ? 'Tuyến vận chuyển đã được duyệt'
          : 'Tuyến vận chuyển bị từ chối',
        status === 'APPROVED'
          ? `Tuyến "${route.origin} → ${route.destination}" của bạn đã được duyệt và hiển thị công khai.`
          : rejectMessage,
      );
    }

    return updated;
  }

  /** Chỉ Provider type=TRANSPORT đã APPROVED mới quản lý Route — tách domain với các loại đối tác khác. */
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

  private async getOwnedRoute(userId: bigint, routeId: bigint) {
    const provider =
      await this.getOwnedApprovedTransportProviderForManage(userId);
    const route = await this.transportRouteRepository.findById(routeId);
    if (!route) {
      throw new NotFoundException('Transport route not found');
    }
    if (route.providerId !== provider.id) {
      throw new ForbiddenException('You do not own this transport route');
    }
    return route;
  }
}
