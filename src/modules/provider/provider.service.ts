import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProviderStatus } from '@prisma/client';
import { buildPaginated, resolvePagination } from '../../shared/utils/pagination';
import { NotificationService } from '../notification/notification.service';
import { ApplyProviderDto } from './dto/apply-provider.dto';
import { ListProvidersDto } from './dto/list-providers.dto';
import { ProviderRepository } from './provider.repository';

@Injectable()
export class ProviderService {
  constructor(
    private readonly providerRepository: ProviderRepository,
    private readonly notificationService: NotificationService,
  ) {}

  async apply(userId: bigint, dto: ApplyProviderDto) {
    const existing = await this.providerRepository.findByUserId(userId);
    if (existing) {
      throw new ConflictException('You have already applied to become a provider');
    }

    return this.providerRepository.create({
      userId,
      name: dto.name,
      description: dto.description,
      logo: dto.logo,
      contact: dto.contact,
    });
  }

  async getMine(userId: bigint) {
    const provider = await this.providerRepository.findByUserId(userId);
    if (!provider) {
      throw new NotFoundException('You have not applied to become a provider yet');
    }
    return provider;
  }

  async list(query: ListProvidersDto) {
    const { page, limit, skip, take } = resolvePagination(query);

    const where: Prisma.ProviderWhereInput = {
      ...(query.status && { status: query.status }),
    };

    const [items, totalItems] = await this.providerRepository.findMany(where, skip, take);
    return buildPaginated(items, totalItems, page, limit);
  }

  async review(id: bigint, status: 'APPROVED' | 'REJECTED', reason?: string) {
    const provider = await this.providerRepository.findById(id);
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    const updated = await this.providerRepository.updateStatus(
      id,
      status as ProviderStatus,
    );

    const rejectMessage = reason
      ? `Hồ sơ đối tác "${provider.name}" của bạn đã bị từ chối. Lý do: ${reason}`
      : `Hồ sơ đối tác "${provider.name}" của bạn đã bị từ chối. Vui lòng liên hệ quản trị viên để biết thêm chi tiết.`;

    await this.notificationService.notify(
      provider.userId,
      status === 'APPROVED' ? 'Hồ sơ đối tác đã được duyệt' : 'Hồ sơ đối tác bị từ chối',
      status === 'APPROVED'
        ? `Hồ sơ đối tác "${provider.name}" của bạn đã được duyệt. Bạn có thể bắt đầu tạo khách sạn.`
        : rejectMessage,
    );

    return updated;
  }
}
