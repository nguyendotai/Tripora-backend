import { Injectable } from '@nestjs/common';
import { Post, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

/** Export de SavedPostRepository dung lai dung 1 shape khi tra ve Post kem trong SavedPost.list.
 * user._count.followers (V8 vong 3) de Frontend hien so nguoi theo doi tac gia ngay tren feed,
 * khong can goi rieng GET /follows moi bai. */
export const POST_INCLUDE = {
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatar: true,
      _count: { select: { followers: true } },
    },
  },
  destination: { select: { id: true, name: true, slug: true } },
  _count: { select: { likes: true } },
} satisfies Prisma.PostInclude;

@Injectable()
export class PostRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    where: Prisma.PostWhereInput,
    skip: number,
    take: number,
  ): Promise<[Post[], number]> {
    return this.prisma.$transaction([
      this.prisma.post.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: POST_INCLUDE,
      }),
      this.prisma.post.count({ where }),
    ]);
  }

  findById(id: bigint) {
    return this.prisma.post.findFirst({
      where: { id, deletedAt: null },
      include: POST_INCLUDE,
    });
  }

  create(data: Prisma.PostCreateInput): Promise<Post> {
    return this.prisma.post.create({ data, include: POST_INCLUDE });
  }

  update(id: bigint, data: Prisma.PostUpdateInput) {
    return this.prisma.post.update({
      where: { id },
      data,
      include: POST_INCLUDE,
    });
  }

  softDelete(id: bigint): Promise<Post> {
    return this.prisma.post.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
