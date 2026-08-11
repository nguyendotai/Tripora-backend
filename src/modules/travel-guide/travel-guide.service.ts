import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DestinationRepository } from '../destination/destination.repository';
import { buildPaginated, resolvePagination } from '../../shared/utils/pagination';
import { slugify } from '../../shared/utils/slugify';
import { CreateTravelGuideDto } from './dto/create-travel-guide.dto';
import { ListTravelGuidesDto } from './dto/list-travel-guides.dto';
import { UpdateTravelGuideDto } from './dto/update-travel-guide.dto';
import { TravelGuideRepository } from './travel-guide.repository';

@Injectable()
export class TravelGuideService {
  constructor(
    private readonly travelGuideRepository: TravelGuideRepository,
    private readonly destinationRepository: DestinationRepository,
  ) {}

  async list(query: ListTravelGuidesDto) {
    const { page, limit, skip, take } = resolvePagination(query);

    const where: Prisma.TravelGuideWhereInput = {
      deletedAt: null,
      ...(query.q && { title: { contains: query.q } }),
    };

    const [items, totalItems] = await this.travelGuideRepository.findMany(
      where,
      skip,
      take,
    );

    return buildPaginated(items, totalItems, page, limit);
  }

  async getBySlug(slug: string) {
    const guide = await this.travelGuideRepository.findBySlug(slug);
    if (!guide) {
      throw new NotFoundException('Travel guide not found');
    }
    return guide;
  }

  async create(dto: CreateTravelGuideDto) {
    const destinationId = await this.resolveDestinationId(dto.destinationId);
    const slug = await this.generateUniqueSlug(dto.title);

    return this.travelGuideRepository.create({
      title: dto.title,
      slug,
      excerpt: dto.excerpt,
      content: dto.content,
      coverImage: dto.coverImage,
      ...(destinationId !== undefined && {
        destination: { connect: { id: destinationId } },
      }),
    });
  }

  async update(id: bigint, dto: UpdateTravelGuideDto) {
    await this.ensureExists(id);
    const destinationId = await this.resolveDestinationId(dto.destinationId);

    return this.travelGuideRepository.update(id, {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.excerpt !== undefined && { excerpt: dto.excerpt }),
      ...(dto.content !== undefined && { content: dto.content }),
      ...(dto.coverImage !== undefined && { coverImage: dto.coverImage }),
      ...(destinationId !== undefined && {
        destination: { connect: { id: destinationId } },
      }),
    });
  }

  async remove(id: bigint) {
    await this.ensureExists(id);
    await this.travelGuideRepository.softDelete(id);
  }

  private async ensureExists(id: bigint) {
    const guide = await this.travelGuideRepository.findById(id);
    if (!guide) {
      throw new NotFoundException('Travel guide not found');
    }
    return guide;
  }

  private async resolveDestinationId(
    raw: string | undefined,
  ): Promise<bigint | undefined> {
    if (raw === undefined) return undefined;

    const destinationId = BigInt(raw);
    const destination = await this.destinationRepository.findById(destinationId);
    if (!destination) {
      throw new BadRequestException(`Destination not found: ${raw}`);
    }
    return destinationId;
  }

  private async generateUniqueSlug(title: string): Promise<string> {
    const base = slugify(title);
    let candidate = base;
    let suffix = 2;

    while (await this.travelGuideRepository.findBySlugExact(candidate)) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }
}
