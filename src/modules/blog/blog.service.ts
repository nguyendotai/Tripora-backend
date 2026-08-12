import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { buildPaginated, resolvePagination } from '../../shared/utils/pagination';
import { slugify } from '../../shared/utils/slugify';
import { BlogRepository } from './blog.repository';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { ListBlogPostsDto } from './dto/list-blog-posts.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';

@Injectable()
export class BlogService {
  constructor(private readonly blogRepository: BlogRepository) {}

  async list(query: ListBlogPostsDto) {
    const { page, limit, skip, take } = resolvePagination(query);

    const where: Prisma.BlogPostWhereInput = {
      deletedAt: null,
      ...(query.q && { title: { contains: query.q } }),
    };

    const [items, totalItems] = await this.blogRepository.findMany(where, skip, take);
    return buildPaginated(items, totalItems, page, limit);
  }

  async getBySlug(slug: string) {
    const post = await this.blogRepository.findBySlug(slug);
    if (!post) {
      throw new NotFoundException('Blog post not found');
    }
    return post;
  }

  async create(dto: CreateBlogPostDto) {
    const slug = await this.generateUniqueSlug(dto.title);

    return this.blogRepository.create({
      title: dto.title,
      slug,
      excerpt: dto.excerpt,
      content: dto.content,
      coverImage: dto.coverImage,
    });
  }

  async update(id: bigint, dto: UpdateBlogPostDto) {
    await this.ensureExists(id);

    return this.blogRepository.update(id, {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.excerpt !== undefined && { excerpt: dto.excerpt }),
      ...(dto.content !== undefined && { content: dto.content }),
      ...(dto.coverImage !== undefined && { coverImage: dto.coverImage }),
    });
  }

  async remove(id: bigint) {
    await this.ensureExists(id);
    await this.blogRepository.softDelete(id);
  }

  private async ensureExists(id: bigint) {
    const post = await this.blogRepository.findById(id);
    if (!post) {
      throw new NotFoundException('Blog post not found');
    }
    return post;
  }

  private async generateUniqueSlug(title: string): Promise<string> {
    const base = slugify(title);
    let candidate = base;
    let suffix = 2;

    while (await this.blogRepository.findBySlugExact(candidate)) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }
}
