import { Injectable } from '@nestjs/common';
import { Experience, ExperienceStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ExperienceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    where: Prisma.ExperienceWhereInput,
    skip: number,
    take: number,
    orderBy: Prisma.ExperienceOrderByWithRelationInput = { createdAt: 'desc' },
  ): Promise<[Experience[], number]> {
    return this.prisma.$transaction([
      this.prisma.experience.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          destination: { select: { id: true, name: true, slug: true } },
          provider: { select: { id: true, name: true, userId: true } },
        },
      }),
      this.prisma.experience.count({ where }),
    ]);
  }

  findBySlug(slug: string): Promise<Experience | null> {
    return this.prisma.experience.findFirst({
      where: { slug, deletedAt: null },
      include: {
        destination: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  findBySlugExact(slug: string): Promise<Experience | null> {
    return this.prisma.experience.findUnique({ where: { slug } });
  }

  findById(id: bigint): Promise<Experience | null> {
    return this.prisma.experience.findFirst({ where: { id, deletedAt: null } });
  }

  create(data: Prisma.ExperienceCreateInput): Promise<Experience> {
    return this.prisma.experience.create({ data });
  }

  update(id: bigint, data: Prisma.ExperienceUpdateInput): Promise<Experience> {
    return this.prisma.experience.update({ where: { id }, data });
  }

  updateStatus(id: bigint, status: ExperienceStatus): Promise<Experience> {
    return this.prisma.experience.update({ where: { id }, data: { status } });
  }

  softDelete(id: bigint): Promise<Experience> {
    return this.prisma.experience.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
