import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { buildPaginated, resolvePagination } from '../../shared/utils/pagination';
import { AirportRepository } from './airport.repository';
import { CreateAirportDto } from './dto/create-airport.dto';
import { ListAirportsDto } from './dto/list-airports.dto';
import { UpdateAirportDto } from './dto/update-airport.dto';

@Injectable()
export class AirportService {
  constructor(private readonly airportRepository: AirportRepository) {}

  async list(query: ListAirportsDto) {
    const { page, limit, skip, take } = resolvePagination(query);

    const where: Prisma.AirportWhereInput = {
      deletedAt: null,
      ...(query.q && {
        OR: [
          { name: { contains: query.q } },
          { city: { contains: query.q } },
          { code: { contains: query.q } },
        ],
      }),
      ...(query.country && { country: query.country }),
    };

    const [items, totalItems] = await this.airportRepository.findMany(where, skip, take);
    return buildPaginated(items, totalItems, page, limit);
  }

  async getById(id: bigint) {
    const airport = await this.airportRepository.findById(id);
    if (!airport) {
      throw new NotFoundException('Airport not found');
    }
    return airport;
  }

  async create(dto: CreateAirportDto) {
    await this.assertCodeFree(dto.code);

    return this.airportRepository.create({
      code: dto.code,
      name: dto.name,
      city: dto.city,
      country: dto.country,
    });
  }

  async update(id: bigint, dto: UpdateAirportDto) {
    const airport = await this.getById(id);

    if (dto.code !== undefined && dto.code !== airport.code) {
      await this.assertCodeFree(dto.code);
    }

    return this.airportRepository.update(airport.id, {
      ...(dto.code !== undefined && { code: dto.code }),
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.city !== undefined && { city: dto.city }),
      ...(dto.country !== undefined && { country: dto.country }),
    });
  }

  async remove(id: bigint) {
    await this.getById(id);
    await this.airportRepository.softDelete(id);
  }

  private async assertCodeFree(code: string) {
    const existing = await this.airportRepository.findByCode(code);
    if (existing) {
      throw new ConflictException(`Airport code already exists: ${code}`);
    }
  }
}
