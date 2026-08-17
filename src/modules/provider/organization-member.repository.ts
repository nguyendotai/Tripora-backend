import { Injectable } from '@nestjs/common';
import { OrganizationMember, OrgMemberRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class OrganizationMemberRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserId(userId: bigint): Promise<OrganizationMember | null> {
    return this.prisma.organizationMember.findUnique({ where: { userId } });
  }

  findById(id: bigint): Promise<OrganizationMember | null> {
    return this.prisma.organizationMember.findUnique({ where: { id } });
  }

  findByProviderId(providerId: bigint) {
    return this.prisma.organizationMember.findMany({
      where: { providerId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
  }

  countByProviderIdAndRole(
    providerId: bigint,
    role: OrgMemberRole,
  ): Promise<number> {
    return this.prisma.organizationMember.count({
      where: { providerId, role },
    });
  }

  create(data: {
    providerId: bigint;
    userId: bigint;
    role: OrgMemberRole;
  }): Promise<OrganizationMember> {
    return this.prisma.organizationMember.create({ data });
  }

  updateRole(id: bigint, role: OrgMemberRole): Promise<OrganizationMember> {
    return this.prisma.organizationMember.update({
      where: { id },
      data: { role },
    });
  }

  remove(id: bigint): Promise<OrganizationMember> {
    return this.prisma.organizationMember.delete({ where: { id } });
  }
}
