import { Injectable } from '@nestjs/common';
import { Prisma, Provider, ProviderStatus, ProviderType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ProviderRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserId(userId: bigint): Promise<Provider | null> {
    return this.prisma.provider.findUnique({ where: { userId } });
  }

  findById(id: bigint): Promise<Provider | null> {
    return this.prisma.provider.findUnique({ where: { id } });
  }

  async findMany(
    where: Prisma.ProviderWhereInput,
    skip: number,
    take: number,
  ): Promise<[Provider[], number]> {
    return this.prisma.$transaction([
      this.prisma.provider.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.provider.count({ where }),
    ]);
  }

  create(data: {
    userId: bigint;
    name: string;
    type?: ProviderType;
    description?: string;
    logo?: string;
    contact?: string;
  }): Promise<Provider> {
    return this.prisma.provider.create({
      data: {
        name: data.name,
        type: data.type,
        description: data.description,
        logo: data.logo,
        contact: data.contact,
        user: { connect: { id: data.userId } },
      },
    });
  }

  updateStatus(id: bigint, status: ProviderStatus): Promise<Provider> {
    return this.prisma.provider.update({ where: { id }, data: { status } });
  }

  /** Duyet Provider + tao OrganizationMember(role=OWNER) cho nguoi nop ho so, cung 1 transaction. */
  async approveAndCreateOwnerMembership(id: bigint): Promise<Provider> {
    return this.prisma.$transaction(async (tx) => {
      const provider = await tx.provider.update({
        where: { id },
        data: { status: 'APPROVED' },
      });
      await tx.organizationMember.upsert({
        where: { userId: provider.userId },
        create: {
          providerId: provider.id,
          userId: provider.userId,
          role: 'OWNER',
        },
        update: {},
      });
      return provider;
    });
  }

  updateCommissionRate(id: bigint, commissionRate: number): Promise<Provider> {
    return this.prisma.provider.update({
      where: { id },
      data: { commissionRate },
    });
  }
}
