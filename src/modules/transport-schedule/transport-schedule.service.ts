import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ProviderStatus,
  ProviderType,
  TransportRouteStatus,
} from '@prisma/client';
import { ProviderRepository } from '../provider/provider.repository';
import { TransportRouteRepository } from '../transport-route/transport-route.repository';
import { VehicleRepository } from '../vehicle/vehicle.repository';
import { ListTransportSchedulesDto } from './dto/list-transport-schedules.dto';
import { SetTransportScheduleDto } from './dto/set-transport-schedule.dto';
import { TransportScheduleRepository } from './transport-schedule.repository';

const MAX_RANGE_DAYS = 90;

@Injectable()
export class TransportScheduleService {
  constructor(
    private readonly transportScheduleRepository: TransportScheduleRepository,
    private readonly transportRouteRepository: TransportRouteRepository,
    private readonly vehicleRepository: VehicleRepository,
    private readonly providerRepository: ProviderRepository,
  ) {}

  /** Public — chỉ khi Route đã APPROVED. */
  async list(query: ListTransportSchedulesDto) {
    const routeId = BigInt(query.routeId);
    const route = await this.transportRouteRepository.findById(routeId);
    if (!route || route.status !== TransportRouteStatus.APPROVED) {
      throw new NotFoundException('Transport route not found');
    }

    const vehicleId = query.vehicleId ? BigInt(query.vehicleId) : undefined;
    const { startDate, endDate } = this.parseRange(
      query.startDate,
      query.endDate,
    );
    return this.transportScheduleRepository.findByRouteAndDateRange(
      routeId,
      vehicleId,
      startDate,
      endDate,
    );
  }

  async listMine(userId: bigint, query: ListTransportSchedulesDto) {
    const routeId = BigInt(query.routeId);
    await this.getOwnedRoute(userId, routeId);

    const vehicleId = query.vehicleId ? BigInt(query.vehicleId) : undefined;
    const { startDate, endDate } = this.parseRange(
      query.startDate,
      query.endDate,
    );
    return this.transportScheduleRepository.findByRouteAndDateRange(
      routeId,
      vehicleId,
      startDate,
      endDate,
    );
  }

  async set(userId: bigint, dto: SetTransportScheduleDto) {
    const provider = await this.getOwnedApprovedTransportProvider(userId);
    const routeId = BigInt(dto.routeId);
    const route = await this.transportRouteRepository.findById(routeId);
    if (!route) {
      throw new NotFoundException('Transport route not found');
    }
    if (route.providerId !== provider.id) {
      throw new ForbiddenException('You do not own this transport route');
    }

    const vehicleId = BigInt(dto.vehicleId);
    const vehicle = await this.vehicleRepository.findById(vehicleId);
    if (!vehicle || vehicle.providerId !== provider.id) {
      throw new NotFoundException('Vehicle not found');
    }

    const { startDate, endDate } = this.parseRange(dto.startDate, dto.endDate);
    const dayCount =
      Math.round(
        (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000),
      ) + 1;
    if (dayCount > MAX_RANGE_DAYS) {
      throw new BadRequestException(
        `Date range cannot exceed ${MAX_RANGE_DAYS} days`,
      );
    }

    const results = [];
    for (let i = 0; i < dayCount; i += 1) {
      const departureDate = new Date(startDate);
      departureDate.setUTCDate(departureDate.getUTCDate() + i);

      const existing =
        await this.transportScheduleRepository.findByRouteVehicleAndDate(
          routeId,
          vehicleId,
          departureDate,
        );
      if (existing) {
        if (dto.capacity < existing.booked) {
          throw new BadRequestException(
            `Cannot set capacity below already-booked count (${existing.booked}) for ${departureDate.toISOString().slice(0, 10)}`,
          );
        }
        const updated = await this.transportScheduleRepository.update(
          existing.id,
          {
            capacity: dto.capacity,
            available: dto.capacity - existing.booked,
            price: dto.price,
          },
        );
        results.push(updated);
      } else {
        const created = await this.transportScheduleRepository.create({
          routeId,
          vehicleId,
          departureDate,
          capacity: dto.capacity,
          available: dto.capacity,
          price: dto.price,
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
      throw new BadRequestException(
        'startDate must be before or equal to endDate',
      );
    }
    return { startDate, endDate };
  }

  private async getOwnedApprovedTransportProvider(userId: bigint) {
    const provider = await this.providerRepository.findByUserId(userId);
    if (
      !provider ||
      provider.status !== ProviderStatus.APPROVED ||
      provider.type !== ProviderType.TRANSPORT
    ) {
      throw new ForbiddenException(
        'You need an approved transportation provider profile to do this',
      );
    }
    return provider;
  }

  private async getOwnedRoute(userId: bigint, routeId: bigint) {
    const provider = await this.getOwnedApprovedTransportProvider(userId);
    const route = await this.transportRouteRepository.findById(routeId);
    if (!route) {
      throw new NotFoundException('Transport route not found');
    }
    if (route.providerId !== provider.id) {
      throw new ForbiddenException('You do not own this transport route');
    }
    return route;
  }
}
