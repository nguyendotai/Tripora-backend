import { Injectable } from '@nestjs/common';
import { Comment, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

const COMMENT_INCLUDE = {
  user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
} satisfies Prisma.CommentInclude;

@Injectable()
export class CommentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findManyByPost(
    postId: bigint,
    skip: number,
    take: number,
  ): Promise<[Comment[], number]> {
    const where: Prisma.CommentWhereInput = { postId, deletedAt: null };
    return this.prisma.$transaction([
      this.prisma.comment.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'asc' },
        include: COMMENT_INCLUDE,
      }),
      this.prisma.comment.count({ where }),
    ]);
  }

  findById(id: bigint) {
    return this.prisma.comment.findFirst({
      where: { id, deletedAt: null },
      include: COMMENT_INCLUDE,
    });
  }

  create(data: Prisma.CommentCreateInput): Promise<Comment> {
    return this.prisma.comment.create({ data, include: COMMENT_INCLUDE });
  }

  update(id: bigint, data: Prisma.CommentUpdateInput) {
    return this.prisma.comment.update({
      where: { id },
      data,
      include: COMMENT_INCLUDE,
    });
  }

  softDelete(id: bigint): Promise<Comment> {
    return this.prisma.comment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
