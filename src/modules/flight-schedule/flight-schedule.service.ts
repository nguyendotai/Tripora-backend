import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { FlightStatus, ProviderStatus, ProviderType } from '@prisma/client';
import { FlightRepository } from '../flight/flight.repository';
import { ProviderRepository } from '../provider/provider.repository';
import { FlightScheduleRepository } from './flight-schedule.repository';
import { ListFlightSchedulesDto } from './dto/list-flight-schedules.dto';
import { SetFlightScheduleDto } from './dto/set-flight-schedule.dto';

const MAX_RANGE_DAYS = 90;

@Injectable()
export class FlightScheduleService {
  constructor(
    private readonly flightScheduleRepository: FlightScheduleRepository,
    private readonly flightRepository: FlightRepository,
    private readonly providerRepository: ProviderRepository,
  ) {}

  /** Public — chỉ khi Flight đã APPROVED. */
  async list(query: ListFlightSchedulesDto) {
    const flightId = BigInt(query.flightId);
    const flight = await this.flightRepository.findById(flightId);
    if (!flight || flight.status !== FlightStatus.APPROVED) {
      throw new NotFoundException('Flight not found');
    }

    const { startDate, endDate } = this.parseRange(query.startDate, query.endDate);
    return this.flightScheduleRepository.findByFlightAndDateRange(flightId, startDate, endDate);
  }

  async listMine(userId: bigint, query: ListFlightSchedulesDto) {
    const flightId = BigInt(query.flightId);
    await this.getOwnedFlight(userId, flightId);

    const { startDate, endDate } = this.parseRange(query.startDate, query.endDate);
    return this.flightScheduleRepository.findByFlightAndDateRange(flightId, startDate, endDate);
  }

  async set(userId: bigint, dto: SetFlightScheduleDto) {
    const flightId = BigInt(dto.flightId);
    await this.getOwnedFlight(userId, flightId);

    const { startDate, endDate } = this.parseRange(dto.startDate, dto.endDate);
    const dayCount =
      Math.round((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    if (dayCount > MAX_RANGE_DAYS) {
      throw new BadRequestException(`Date range cannot exceed ${MAX_RANGE_DAYS} days`);
    }

    const results = [];
    for (let i = 0; i < dayCount; i += 1) {
      const departureDate = new Date(startDate);
      departureDate.setUTCDate(departureDate.getUTCDate() + i);

      const existing = await this.flightScheduleRepository.findByFlightAndDate(
        flightId,
        departureDate,
      );
      if (existing) {
        const updated = await this.flightScheduleRepository.update(existing.id, {
          departureTime: dto.departureTime,
          arrivalTime: dto.arrivalTime,
          economyPrice: dto.economyPrice,
          businessPrice: dto.businessPrice,
        });
        results.push(updated);
      } else {
        const created = await this.flightScheduleRepository.create({
          flightId,
          departureDate,
          departureTime: dto.departureTime,
          arrivalTime: dto.arrivalTime,
          economyPrice: dto.economyPrice,
          businessPrice: dto.businessPrice,
        });
        results.push(created);
      }
    }

    return results;
  }

  private parseRange(startDateRaw: string, endDateRaw: string) {
    const startDate = new Date(`${startDateRaw}T00:00:00.000Z`);
    const endDate = new Date(`${endDateRaw}T00:00:00.000Z`);
    if (startDate > endDate) {
      throw new BadRequestException('startDate must be before or equal to endDate');
    }
    return { startDate, endDate };
  }

  private async getOwnedApprovedAirlineProvider(userId: bigint) {
    const provider = await this.providerRepository.findByUserId(userId);
    if (
      !provider ||
      provider.status !== ProviderStatus.APPROVED ||
      provider.type !== ProviderType.FLIGHT
    ) {
      throw new ForbiddenException('You need an approved airline profile to do this');
    }
    return provider;
  }

  private async getOwnedFlight(userId: bigint, flightId: bigint) {
    const provider = await this.getOwnedApprovedAirlineProvider(userId);
    const flight = await this.flightRepository.findById(flightId);
    if (!flight) {
      throw new NotFoundException('Flight not found');
    }
    if (flight.providerId !== provider.id) {
      throw new ForbiddenException('You do not own this flight');
    }
    return flight;
  }
}
