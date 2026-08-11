import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { buildPaginated, resolvePagination } from '../../shared/utils/pagination';
import { slugify } from '../../shared/utils/slugify';
import { CreateDestinationDto } from './dto/create-destination.dto';
import { ListDestinationsDto } from './dto/list-destinations.dto';
import { UpdateDestinationDto } from './dto/update-destination.dto';
import { DestinationRepository } from './destination.repository';

@Injectable()
export class DestinationService {
  constructor(private readonly destinationRepository: DestinationRepository) {}

  async list(query: ListDestinationsDto) {
    const { page, limit, skip, take } = resolvePagination(query);

    const where: Prisma.DestinationWhereInput = {
      deletedAt: null,
      ...(query.q && { name: { contains: query.q } }),
      ...(query.country && { country: query.country }),
    };

    const [items, totalItems] = await this.destinationRepository.findMany(
      where,
      skip,
      take,
    );

    return buildPaginated(items, totalItems, page, limit);
  }

  async getBySlug(slug: string) {
    const destination = await this.destinationRepository.findBySlug(slug);
    if (!destination) {
      throw new NotFoundException('Destination not found');
    }
    return destination;
  }

  async create(dto: CreateDestinationDto) {
    const slug = await this.generateUniqueSlug(dto.name);

    return this.destinationRepository.create({
      name: dto.name,
      slug,
      country: dto.country,
      description: dto.description,
      images: dto.images ?? undefined,
      tags: dto.tags ?? undefined,
    });
  }

  async update(id: bigint, dto: UpdateDestinationDto) {
    await this.ensureExists(id);

    return this.destinationRepository.update(id, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.country !== undefined && { country: dto.country }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.images !== undefined && { images: dto.images }),
      ...(dto.tags !== undefined && { tags: dto.tags }),
    });
  }

  async remove(id: bigint) {
    await this.ensureExists(id);
    await this.destinationRepository.softDelete(id);
  }

  private async ensureExists(id: bigint) {
    const destination = await this.destinationRepository.findById(id);
    if (!destination) {
      throw new NotFoundException('Destination not found');
    }
    return destination;
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const base = slugify(name);
    let candidate = base;
    let suffix = 2;

    while (await this.destinationRepository.findBySlugExact(candidate)) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }
}
