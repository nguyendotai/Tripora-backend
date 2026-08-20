import { Injectable } from '@nestjs/common';
import { BookingStatus, Experience, ExperienceStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

const EXPERIENCE_LIST_INCLUDE = {
  destination: { select: { id: true, name: true, slug: true } },
  provider: { select: { id: true, name: true, userId: true } },
} satisfies Prisma.ExperienceInclude;

@Injectable()
export class ExperienceRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** "Noi bat" = duoc dat nhieu nhat (ExperienceBooking CONFIRMED/COMPLETED) — mirror
   * PropertyRepository.findPopular. */
  async findPopular(limit: number): Promise<Experience[]> {
    const grouped = await this.prisma.experienceBooking.groupBy({
      by: ['experienceId'],
      where: {
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
      },
      _count: { experienceId: true },
      orderBy: { _count: { experienceId: 'desc' } },
      take: limit,
    });
    if (grouped.length === 0) {
      return [];
    }

    const items = await this.prisma.experience.findMany({
      where: {
        id: { in: grouped.map((g) => g.experienceId) },
        status: ExperienceStatus.APPROVED,
        deletedAt: null,
      },
      include: EXPERIENCE_LIST_INCLUDE,
    });
    const byId = new Map(items.map((item) => [item.id.toString(), item]));

    return grouped
      .map((g) => byId.get(g.experienceId.toString()))
      .filter((item): item is (typeof items)[number] => !!item);
  }

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
        include: EXPERIENCE_LIST_INCLUDE,
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
