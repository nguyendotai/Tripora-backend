import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProviderStatus } from '@prisma/client';
import {
  buildPaginated,
  resolvePagination,
} from '../../shared/utils/pagination';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { NotificationService } from '../notification/notification.service';
import { ApplyProviderDto } from './dto/apply-provider.dto';
import { ListProvidersDto } from './dto/list-providers.dto';
import { OrganizationMemberRepository } from './organization-member.repository';
import { ProviderRepository } from './provider.repository';

@Injectable()
export class ProviderService {
  constructor(
    private readonly providerRepository: ProviderRepository,
    private readonly organizationMemberRepository: OrganizationMemberRepository,
    private readonly notificationService: NotificationService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async apply(userId: bigint, dto: ApplyProviderDto) {
    const existing = await this.providerRepository.findByUserId(userId);
    if (existing) {
      throw new ConflictException(
        'You have already applied to become a provider',
      );
    }

    return this.providerRepository.create({
      userId,
      name: dto.name,
      type: dto.type,
      description: dto.description,
      logo: dto.logo,
      contact: dto.contact,
      documents: dto.documents,
    });
  }

  /**
   * V7 vong 1: uu tien tra theo OrganizationMember (dung cho ca Owner lan Manager/Staff duoc
   * moi sau nay, kem `role` de Admin gan vao session dang nhap) — nhung 1 nguoi vua nop ho so
   * con PENDING/REJECTED thi CHUA co membership (chi tao luc APPROVE, xem
   * `provider.repository.ts#approveAndCreateOwnerMembership`), nen fallback ve
   * `Provider.userId` cu de Frontend van hien dung trang thai (khong co field `role`).
   */
  async getMine(userId: bigint) {
    const member = await this.organizationMemberRepository.findByUserId(userId);
    if (member) {
      const provider = await this.providerRepository.findById(
        member.providerId,
      );
      if (provider) {
        return { ...provider, role: member.role };
      }
    }

    const provider = await this.providerRepository.findByUserId(userId);
    if (!provider) {
      throw new NotFoundException(
        'You have not applied to become a provider yet',
      );
    }
    return provider;
  }

  async list(query: ListProvidersDto) {
    const { page, limit, skip, take } = resolvePagination(query);

    const where: Prisma.ProviderWhereInput = {
      ...(query.status && { status: query.status }),
    };

    const [items, totalItems] = await this.providerRepository.findMany(
      where,
      skip,
      take,
    );
    return buildPaginated(items, totalItems, page, limit);
  }

  async review(
    actorId: bigint,
    actorRole: string,
    id: bigint,
    status: 'APPROVED' | 'REJECTED',
    reason?: string,
  ) {
    const provider = await this.providerRepository.findById(id);
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    const updated =
      status === 'APPROVED'
        ? await this.providerRepository.approveAndCreateOwnerMembership(id)
        : await this.providerRepository.updateStatus(id, status);

    const rejectMessage = reason
      ? `Hồ sơ đối tác "${provider.name}" của bạn đã bị từ chối. Lý do: ${reason}`
      : `Hồ sơ đối tác "${provider.name}" của bạn đã bị từ chối. Vui lòng liên hệ quản trị viên để biết thêm chi tiết.`;

    await this.notificationService.notify(
      provider.userId,
      status === 'APPROVED'
        ? 'Hồ sơ đối tác đã được duyệt'
        : 'Hồ sơ đối tác bị từ chối',
      status === 'APPROVED'
        ? `Hồ sơ đối tác "${provider.name}" của bạn đã được duyệt. Bạn có thể bắt đầu tạo khách sạn.`
        : rejectMessage,
    );

    await this.activityLogService.log({
      actorId,
      actorRole,
      action: 'provider.review',
      entityType: 'provider',
      entityId: id,
      reason,
      metadata: { status },
    });

    return updated;
  }

  /** Khoá 1 Provider đang APPROVED — chặn mọi thao tác tự quản lý (Property/Room/Inventory) cho tới khi mở khoá. */
  async suspend(
    actorId: bigint,
    actorRole: string,
    id: bigint,
    reason?: string,
  ) {
    const provider = await this.providerRepository.findById(id);
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }
    if (provider.status !== ProviderStatus.APPROVED) {
      throw new BadRequestException(
        'Only an approved provider can be suspended',
      );
    }

    const updated = await this.providerRepository.updateStatus(
      id,
      ProviderStatus.SUSPENDED,
    );

    const message = reason
      ? `Hồ sơ đối tác "${provider.name}" của bạn đã bị khoá. Lý do: ${reason}`
      : `Hồ sơ đối tác "${provider.name}" của bạn đã bị khoá. Vui lòng liên hệ quản trị viên để biết thêm chi tiết.`;
    await this.notificationService.notify(
      provider.userId,
      'Hồ sơ đối tác đã bị khoá',
      message,
    );

    await this.activityLogService.log({
      actorId,
      actorRole,
      action: 'provider.suspend',
      entityType: 'provider',
      entityId: id,
      reason,
    });

    return updated;
  }

  /** Mở khoá 1 Provider đang SUSPENDED, trả lại APPROVED. */
  async unsuspend(actorId: bigint, actorRole: string, id: bigint) {
    const provider = await this.providerRepository.findById(id);
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }
    if (provider.status !== ProviderStatus.SUSPENDED) {
      throw new BadRequestException(
        'Only a suspended provider can be unsuspended',
      );
    }

    const updated = await this.providerRepository.updateStatus(
      id,
      ProviderStatus.APPROVED,
    );

    await this.notificationService.notify(
      provider.userId,
      'Hồ sơ đối tác đã được mở khoá',
      `Hồ sơ đối tác "${provider.name}" của bạn đã được mở khoá. Bạn có thể tiếp tục quản lý khách sạn.`,
    );

    await this.activityLogService.log({
      actorId,
      actorRole,
      action: 'provider.unsuspend',
      entityType: 'provider',
      entityId: id,
    });

    return updated;
  }

  /** Chinh ty le hoa hong Platform an tren moi Booking CONFIRMED cua Provider nay (V6 vong 2). */
  async updateCommissionRate(
    actorId: bigint,
    actorRole: string,
    id: bigint,
    commissionRate: number,
  ) {
    const provider = await this.providerRepository.findById(id);
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }
    const updated = await this.providerRepository.updateCommissionRate(
      id,
      commissionRate,
    );

    await this.activityLogService.log({
      actorId,
      actorRole,
      action: 'provider.updateCommissionRate',
      entityType: 'provider',
      entityId: id,
      metadata: { commissionRate },
    });

    return updated;
  }
}
