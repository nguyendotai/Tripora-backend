import { Injectable } from '@nestjs/common';
import { BlogPost, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class BlogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    where: Prisma.BlogPostWhereInput,
    skip: number,
    take: number,
  ): Promise<[BlogPost[], number]> {
    return this.prisma.$transaction([
      this.prisma.blogPost.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.blogPost.count({ where }),
    ]);
  }

  findBySlug(slug: string): Promise<BlogPost | null> {
    return this.prisma.blogPost.findFirst({
      where: { slug, deletedAt: null },
    });
  }

  findById(id: bigint): Promise<BlogPost | null> {
    return this.prisma.blogPost.findFirst({
      where: { id, deletedAt: null },
    });
  }

  findBySlugExact(slug: string): Promise<BlogPost | null> {
    return this.prisma.blogPost.findUnique({ where: { slug } });
  }

  create(data: Prisma.BlogPostCreateInput): Promise<BlogPost> {
    return this.prisma.blogPost.create({ data });
  }

  update(id: bigint, data: Prisma.BlogPostUpdateInput): Promise<BlogPost> {
    return this.prisma.blogPost.update({ where: { id }, data });
  }

  softDelete(id: bigint): Promise<BlogPost> {
    return this.prisma.blogPost.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
