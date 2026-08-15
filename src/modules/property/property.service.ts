import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProviderStatus, ProviderType, PropertyStatus } from '@prisma/client';
import { DestinationRepository } from '../destination/destination.repository';
import { NotificationService } from '../notification/notification.service';
import { ProviderRepository } from '../provider/provider.repository';
import { buildPaginated, resolvePagination } from '../../shared/utils/pagination';
import { slugify } from '../../shared/utils/slugify';
import { CreatePropertyDto } from './dto/create-property.dto';
import { ListPropertiesDto } from './dto/list-properties.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { PropertyRepository } from './property.repository';

@Injectable()
export class PropertyService {
  constructor(
    private readonly propertyRepository: PropertyRepository,
    private readonly providerRepository: ProviderRepository,
    private readonly destinationRepository: DestinationRepository,
    private readonly notificationService: NotificationService,
  ) {}

  /** Public — chỉ Property đã APPROVED, kèm fromPrice (giá thấp nhất trong các Room ACTIVE). */
  async list(query: ListPropertiesDto) {
    const { page, limit, skip, take } = resolvePagination(query);

    const where: Prisma.PropertyWhereInput = {
      deletedAt: null,
      status: PropertyStatus.APPROVED,
      ...(query.q && { name: { contains: query.q } }),
      ...(query.destinationId && { destinationId: BigInt(query.destinationId) }),
    };

    const orderBy: Prisma.PropertyOrderByWithRelationInput =
      query.sort === 'name_asc' ? { name: 'asc' } : { createdAt: 'desc' };

    const [items, totalItems] = await this.propertyRepository.findMany(where, skip, take, orderBy);
    const minPrices = await this.propertyRepository.findMinPricesByPropertyIds(
      items.map((item) => item.id),
    );
    const itemsWithPrice = items.map((item) => ({
      ...item,
      fromPrice: minPrices.get(item.id)?.toString() ?? null,
    }));

    return buildPaginated(itemsWithPrice, totalItems, page, limit);
  }

  async getBySlug(slug: string) {
    const property = await this.propertyRepository.findBySlug(slug);
    if (!property || property.status !== PropertyStatus.APPROVED) {
      throw new NotFoundException('Property not found');
    }
    return property;
  }

  /** Provider xem toàn bộ Property của chính mình, bất kể status. */
  async listMine(userId: bigint, query: ListPropertiesDto) {
    const provider = await this.getOwnedApprovedProvider(userId);
    const { page, limit, skip, take } = resolvePagination(query);

    const where: Prisma.PropertyWhereInput = {
      deletedAt: null,
      providerId: provider.id,
      ...(query.status && { status: query.status }),
    };

    const [items, totalItems] = await this.propertyRepository.findMany(where, skip, take);
    return buildPaginated(items, totalItems, page, limit);
  }

  /** Admin — xem toàn bộ Property của mọi Provider, filter theo status. */
  async listForModeration(query: ListPropertiesDto) {
    const { page, limit, skip, take } = resolvePagination(query);

    const where: Prisma.PropertyWhereInput = {
      deletedAt: null,
      ...(query.status && { status: query.status }),
    };

    const [items, totalItems] = await this.propertyRepository.findMany(where, skip, take);
    return buildPaginated(items, totalItems, page, limit);
  }

  async create(userId: bigint, dto: CreatePropertyDto) {
    const provider = await this.getOwnedApprovedProvider(userId);

    if (dto.destinationId) {
      const destination = await this.destinationRepository.findById(BigInt(dto.destinationId));
      if (!destination) {
        throw new BadRequestException(`Destination not found: ${dto.destinationId}`);
      }
    }

    const slug = await this.generateUniqueSlug(dto.name);

    return this.propertyRepository.create({
      name: dto.name,
      slug,
      description: dto.description,
      address: dto.address,
      latitude: dto.latitude,
      longitude: dto.longitude,
      images: dto.images,
      amenities: dto.amenities,
      checkInTime: dto.checkInTime,
      checkOutTime: dto.checkOutTime,
      policies: dto.policies,
      provider: { connect: { id: provider.id } },
      ...(dto.destinationId && {
        destination: { connect: { id: BigInt(dto.destinationId) } },
      }),
    });
  }

  async update(userId: bigint, propertyId: bigint, dto: UpdatePropertyDto) {
    const property = await this.getOwnedProperty(userId, propertyId);

    if (dto.destinationId) {
      const destination = await this.destinationRepository.findById(BigInt(dto.destinationId));
      if (!destination) {
        throw new BadRequestException(`Destination not found: ${dto.destinationId}`);
      }
    }

    return this.propertyRepository.update(property.id, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.address !== undefined && { address: dto.address }),
      ...(dto.latitude !== undefined && { latitude: dto.latitude }),
      ...(dto.longitude !== undefined && { longitude: dto.longitude }),
      ...(dto.images !== undefined && { images: dto.images }),
      ...(dto.amenities !== undefined && { amenities: dto.amenities }),
      ...(dto.checkInTime !== undefined && { checkInTime: dto.checkInTime }),
      ...(dto.checkOutTime !== undefined && { checkOutTime: dto.checkOutTime }),
      ...(dto.policies !== undefined && { policies: dto.policies }),
      ...(dto.destinationId !== undefined && {
        destination: { connect: { id: BigInt(dto.destinationId) } },
      }),
    });
  }

  async remove(userId: bigint, propertyId: bigint) {
    const property = await this.getOwnedProperty(userId, propertyId);
    await this.propertyRepository.softDelete(property.id);
  }

  async review(id: bigint, status: 'APPROVED' | 'REJECTED', reason?: string) {
    const property = await this.propertyRepository.findById(id);
    if (!property) {
      throw new NotFoundException('Property not found');
    }

    const updated = await this.propertyRepository.updateStatus(id, status as PropertyStatus);

    const provider = await this.providerRepository.findById(property.providerId);
    if (provider) {
      const rejectMessage = reason
        ? `Khách sạn "${property.name}" của bạn đã bị từ chối. Lý do: ${reason}`
        : `Khách sạn "${property.name}" của bạn đã bị từ chối. Vui lòng liên hệ quản trị viên để biết thêm chi tiết.`;

      await this.notificationService.notify(
        provider.userId,
        status === 'APPROVED' ? 'Khách sạn đã được duyệt' : 'Khách sạn bị từ chối',
        status === 'APPROVED'
          ? `Khách sạn "${property.name}" của bạn đã được duyệt và hiển thị công khai.`
          : rejectMessage,
      );
    }

    return updated;
  }

  /** Chỉ Provider type=HOTEL đã APPROVED mới quản lý Property — tách domain với Tour Operator (V3). */
  private async getOwnedApprovedProvider(userId: bigint) {
    const provider = await this.providerRepository.findByUserId(userId);
    if (
      !provider ||
      provider.status !== ProviderStatus.APPROVED ||
      provider.type !== ProviderType.HOTEL
    ) {
      throw new ForbiddenException('You need an approved provider profile to do this');
    }
    return provider;
  }

  private async getOwnedProperty(userId: bigint, propertyId: bigint) {
    const provider = await this.getOwnedApprovedProvider(userId);
    const property = await this.propertyRepository.findById(propertyId);
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    if (property.providerId !== provider.id) {
      throw new ForbiddenException('You do not own this property');
    }
    return property;
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const base = slugify(name);
    let candidate = base;
    let suffix = 2;

    while (await this.propertyRepository.findBySlugExact(candidate)) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }
}
