import { Injectable } from '@nestjs/common';
import { Prisma, Review } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

const REVIEW_INCLUDE = {
  user: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.ReviewInclude;

// Home page "Danh gia tu khach hang" — can them avatar + ten San pham/Diem den de card hien du
// ngu canh, khac REVIEW_INCLUDE dung cho list thong thuong (khong can 2 field nay).
const REVIEW_HIGHLIGHT_INCLUDE = {
  user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
  property: { select: { id: true, name: true, slug: true } },
  destination: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.ReviewInclude;

@Injectable()
export class ReviewRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Home page — review noi bat: rating >=4, co noi dung, moi nhat truoc. */
  findHighlights(limit: number) {
    return this.prisma.review.findMany({
      where: { deletedAt: null, rating: { gte: 4 }, content: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: REVIEW_HIGHLIGHT_INCLUDE,
    });
  }

  async findMany(
    where: Prisma.ReviewWhereInput,
    skip: number,
    take: number,
  ): Promise<[Review[], number]> {
    return this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: REVIEW_INCLUDE,
      }),
      this.prisma.review.count({ where }),
    ]);
  }

  findById(id: bigint): Promise<Review | null> {
    return this.prisma.review.findFirst({ where: { id, deletedAt: null } });
  }

  findByUserAndDestination(
    userId: bigint,
    destinationId: bigint,
  ): Promise<Review | null> {
    return this.prisma.review.findUnique({
      where: { userId_destinationId: { userId, destinationId } },
    });
  }

  findByUserAndProperty(
    userId: bigint,
    propertyId: bigint,
  ): Promise<Review | null> {
    return this.prisma.review.findUnique({
      where: { userId_propertyId: { userId, propertyId } },
    });
  }

  create(data: Prisma.ReviewCreateInput): Promise<Review> {
    return this.prisma.review.create({ data });
  }

  update(id: bigint, data: Prisma.ReviewUpdateInput): Promise<Review> {
    return this.prisma.review.update({ where: { id }, data });
  }

  softDelete(id: bigint): Promise<Review> {
    return this.prisma.review.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
