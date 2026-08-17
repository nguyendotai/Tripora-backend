import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrganizationMember,
  OrgMemberRole,
  Provider,
  ProviderStatus,
  ProviderType,
} from '@prisma/client';
import { UserRepository } from '../user/user.repository';
import { CreateOrganizationMemberDto } from './dto/create-organization-member.dto';
import { canManageRole, Permission, ROLE_PERMISSIONS } from './permissions';
import { OrganizationMemberRepository } from './organization-member.repository';
import { ProviderRepository } from './provider.repository';

@Injectable()
export class OrganizationMemberService {
  constructor(
    private readonly organizationMemberRepository: OrganizationMemberRepository,
    private readonly providerRepository: ProviderRepository,
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * Thay the truc tiep cho `providerRepository.findByUserId(userId)` cu (gia dinh 1:1) —
   * tra ve Provider + membership cua userId trong Provider do, kem check status/type/permission
   * neu can. Throw dung message cu ("You need an approved provider profile to do this") de
   * cac domain migrate sang khong doi hanh vi cho Owner (chi khac hanh vi cho Manager/Staff).
   */
  async requireMembership(
    userId: bigint,
    opts?: { providerType?: ProviderType; permission?: Permission },
  ): Promise<{ provider: Provider; member: OrganizationMember }> {
    const member = await this.organizationMemberRepository.findByUserId(userId);
    if (!member) {
      throw new ForbiddenException(
        'You need an approved provider profile to do this',
      );
    }

    const provider = await this.providerRepository.findById(member.providerId);
    if (
      !provider ||
      provider.status !== ProviderStatus.APPROVED ||
      (opts?.providerType && provider.type !== opts.providerType)
    ) {
      throw new ForbiddenException(
        'You need an approved provider profile to do this',
      );
    }

    if (
      opts?.permission &&
      !ROLE_PERMISSIONS[member.role].has(opts.permission)
    ) {
      throw new ForbiddenException('You do not have permission to do this');
    }

    return { provider, member };
  }

  async listMembers(userId: bigint) {
    const { provider } = await this.requireMembership(userId, {
      permission: 'member:view',
    });
    return this.organizationMemberRepository.findByProviderId(provider.id);
  }

  async createMember(userId: bigint, dto: CreateOrganizationMemberDto) {
    const { provider, member: actor } = await this.requireMembership(userId, {
      permission: 'member:manage',
    });

    if (!canManageRole(actor.role, dto.role)) {
      throw new ForbiddenException(
        'You do not have permission to assign this role',
      );
    }

    const targetUser = await this.userRepository.findByEmail(dto.email);
    if (!targetUser) {
      throw new NotFoundException('No Tripora account found with this email');
    }

    const existing = await this.organizationMemberRepository.findByUserId(
      targetUser.id,
    );
    if (existing) {
      throw new ConflictException(
        'This account is already a member of an organization',
      );
    }

    return this.organizationMemberRepository.create({
      providerId: provider.id,
      userId: targetUser.id,
      role: dto.role,
    });
  }

  async updateMemberRole(
    userId: bigint,
    memberId: bigint,
    role: OrgMemberRole,
  ) {
    const { provider, member: actor } = await this.requireMembership(userId);
    if (actor.role !== 'OWNER') {
      throw new ForbiddenException('Only an Owner can change a member role');
    }

    const target = await this.getOwnedMember(provider.id, memberId);

    if (target.role === 'OWNER' && role !== 'OWNER') {
      await this.assertNotLastOwner(provider.id);
    }

    return this.organizationMemberRepository.updateRole(target.id, role);
  }

  async removeMember(userId: bigint, memberId: bigint) {
    const { provider, member: actor } = await this.requireMembership(userId, {
      permission: 'member:manage',
    });

    const target = await this.getOwnedMember(provider.id, memberId);

    if (!canManageRole(actor.role, target.role)) {
      throw new ForbiddenException(
        'You do not have permission to remove this member',
      );
    }

    if (target.role === 'OWNER') {
      await this.assertNotLastOwner(provider.id);
    }

    await this.organizationMemberRepository.remove(target.id);
  }

  private async getOwnedMember(providerId: bigint, memberId: bigint) {
    const target = await this.organizationMemberRepository.findById(memberId);
    if (!target || target.providerId !== providerId) {
      throw new NotFoundException('Member not found');
    }
    return target;
  }

  private async assertNotLastOwner(providerId: bigint) {
    const ownerCount =
      await this.organizationMemberRepository.countByProviderIdAndRole(
        providerId,
        'OWNER',
      );
    if (ownerCount <= 1) {
      throw new BadRequestException(
        'An organization must have at least one Owner',
      );
    }
  }
}
