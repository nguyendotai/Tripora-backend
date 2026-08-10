import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PartnerVerificationStatus, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ActivityLogService } from '../activity/activity-log.service';
import { AuthenticatedUser } from '../../common/guards/jwt-auth.guard';
import { CreatePartnerDto } from './dto/create-partner.dto';

const PARTNER_SELECT = {
  id: true,
  ownerId: true,
  businessName: true,
  businessType: true,
  contactEmail: true,
  contactPhone: true,
  verificationStatus: true,
  verifiedAt: true,
  ratingAverage: true,
  ratingCount: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PartnerSelect;

@Injectable()
export class PartnerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
  ) {}

  async create(dto: CreatePartnerDto, user: AuthenticatedUser) {
    const existing = await this.prisma.partner.findFirst({
      where: { ownerId: BigInt(user.id), deletedAt: null },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('You already have a Partner profile');
    }

    const partner = await this.prisma.partner.create({
      data: {
        ownerId: BigInt(user.id),
        businessName: dto.businessName,
        businessType: dto.businessType,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
      },
      select: PARTNER_SELECT,
    });

    await this.activityLog.log({
      actorId: BigInt(user.id),
      action: 'partner.created',
      resourceType: 'PARTNER',
      resourceId: partner.id,
    });

    return partner;
  }

  async findMine(user: AuthenticatedUser) {
    const partner = await this.prisma.partner.findFirst({
      where: { ownerId: BigInt(user.id), deletedAt: null },
      select: PARTNER_SELECT,
    });
    if (!partner) {
      throw new NotFoundException('You do not have a Partner profile');
    }
    return partner;
  }

  async findPendingApproval() {
    return this.prisma.partner.findMany({
      where: { verificationStatus: PartnerVerificationStatus.PENDING, deletedAt: null },
      select: PARTNER_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  async verify(id: bigint, actorId: bigint) {
    const partner = await this.getOrThrow(id);
    if (partner.verificationStatus !== PartnerVerificationStatus.PENDING) {
      throw new BadRequestException('Partner is not pending verification');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.partner.update({
        where: { id },
        data: { verificationStatus: PartnerVerificationStatus.VERIFIED, verifiedAt: new Date() },
        select: PARTNER_SELECT,
      });
      await tx.user.update({ where: { id: partner.ownerId }, data: { role: UserRole.PARTNER } });
      await tx.notification.create({
        data: {
          userId: partner.ownerId,
          type: 'PARTNER_VERIFIED',
          title: 'Hồ sơ Partner đã được duyệt',
          message: `Hồ sơ "${partner.businessName}" đã được xác minh. Bạn có thể bắt đầu đăng Property.`,
        },
      });
      return result;
    });

    await this.activityLog.log({
      actorId,
      action: 'partner.verified',
      resourceType: 'PARTNER',
      resourceId: id,
    });

    return updated;
  }

  async reject(id: bigint, reason: string, actorId: bigint) {
    const partner = await this.getOrThrow(id);
    if (partner.verificationStatus !== PartnerVerificationStatus.PENDING) {
      throw new BadRequestException('Partner is not pending verification');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.partner.update({
        where: { id },
        data: { verificationStatus: PartnerVerificationStatus.REJECTED },
        select: PARTNER_SELECT,
      });
      await tx.notification.create({
        data: {
          userId: partner.ownerId,
          type: 'PARTNER_REJECTED',
          title: 'Hồ sơ Partner bị từ chối',
          message: reason,
        },
      });
      return result;
    });

    await this.activityLog.log({
      actorId,
      action: 'partner.rejected',
      resourceType: 'PARTNER',
      resourceId: id,
      metadata: { reason },
    });

    return updated;
  }

  private async getOrThrow(id: bigint) {
    const partner = await this.prisma.partner.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, ownerId: true, businessName: true, verificationStatus: true },
    });
    if (!partner) {
      throw new NotFoundException('Partner not found');
    }
    return partner;
  }
}
