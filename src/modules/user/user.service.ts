import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserStatus } from '@prisma/client';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { NotificationService } from '../notification/notification.service';
import {
  buildPaginated,
  resolvePagination,
} from '../../shared/utils/pagination';
import { UserRepository } from './user.repository';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { sanitizeUser } from './user.mapper';

const STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: 'hoạt động',
  INACTIVE: 'ngừng hoạt động',
  BANNED: 'bị cấm',
};

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly notificationService: NotificationService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async getById(id: bigint) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateProfile(id: bigint, dto: UpdateProfileDto) {
    return this.userRepository.updateProfile(id, dto);
  }

  async list(query: ListUsersDto) {
    const { page, limit, skip, take } = resolvePagination(query);

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(query.q && {
        OR: [
          { email: { contains: query.q } },
          { firstName: { contains: query.q } },
          { lastName: { contains: query.q } },
        ],
      }),
    };

    const [items, totalItems] = await this.userRepository.findMany(
      where,
      skip,
      take,
    );
    return buildPaginated(items.map(sanitizeUser), totalItems, page, limit);
  }

  async updateStatus(
    targetId: bigint,
    currentUserId: bigint,
    currentUserRole: string,
    status: UserStatus,
  ) {
    if (targetId === currentUserId) {
      throw new BadRequestException('You cannot change your own status');
    }
    await this.getById(targetId);
    const user = await this.userRepository.updateStatus(targetId, status);

    await this.notificationService.notify(
      targetId,
      'Trạng thái tài khoản đã thay đổi',
      `Tài khoản của bạn hiện đang ${STATUS_LABELS[status]}.`,
    );

    await this.activityLogService.log({
      actorId: currentUserId,
      actorRole: currentUserRole,
      action: 'user.updateStatus',
      entityType: 'user',
      entityId: targetId,
      metadata: { status },
    });

    return user;
  }
}
