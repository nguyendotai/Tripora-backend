import { Injectable } from '@nestjs/common';
import { Prisma, Provider, ProviderStatus } from '@prisma/client';
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
        include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
      }),
      this.prisma.provider.count({ where }),
    ]);
  }

  create(data: {
    userId: bigint;
    name: string;
    description?: string;
    logo?: string;
    contact?: string;
  }): Promise<Provider> {
    return this.prisma.provider.create({
      data: {
        name: data.name,
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
}
