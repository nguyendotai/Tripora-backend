import { Injectable } from '@nestjs/common';
import { Prisma, Property, PropertyStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PropertyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    where: Prisma.PropertyWhereInput,
    skip: number,
    take: number,
  ): Promise<[Property[], number]> {
    return this.prisma.$transaction([
      this.prisma.property.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          destination: { select: { id: true, name: true, slug: true } },
          provider: { select: { id: true, name: true, userId: true } },
        },
      }),
      this.prisma.property.count({ where }),
    ]);
  }

  findBySlug(slug: string): Promise<Property | null> {
    return this.prisma.property.findFirst({
      where: { slug, deletedAt: null },
      include: { destination: { select: { id: true, name: true, slug: true } } },
    });
  }

  findBySlugExact(slug: string): Promise<Property | null> {
    return this.prisma.property.findUnique({ where: { slug } });
  }

  findById(id: bigint): Promise<Property | null> {
    return this.prisma.property.findFirst({ where: { id, deletedAt: null } });
  }

  create(data: Prisma.PropertyCreateInput): Promise<Property> {
    return this.prisma.property.create({ data });
  }

  update(id: bigint, data: Prisma.PropertyUpdateInput): Promise<Property> {
    return this.prisma.property.update({ where: { id }, data });
  }

  updateStatus(id: bigint, status: PropertyStatus): Promise<Property> {
    return this.prisma.property.update({ where: { id }, data: { status } });
  }

  softDelete(id: bigint): Promise<Property> {
    return this.prisma.property.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
