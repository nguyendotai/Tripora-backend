import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AircraftStatus,
  FlightStatus,
  Prisma,
  ProviderType,
} from '@prisma/client';
import { AircraftRepository } from '../aircraft/aircraft.repository';
import { AirportRepository } from '../airport/airport.repository';
import { NotificationService } from '../notification/notification.service';
import { OrganizationMemberService } from '../provider/organization-member.service';
import { ProviderRepository } from '../provider/provider.repository';
import {
  buildPaginated,
  resolvePagination,
} from '../../shared/utils/pagination';
import { CreateFlightDto } from './dto/create-flight.dto';
import { ListFlightsDto } from './dto/list-flights.dto';
import { UpdateFlightDto } from './dto/update-flight.dto';
import { FlightRepository } from './flight.repository';

@Injectable()
export class FlightService {
  constructor(
    private readonly flightRepository: FlightRepository,
    private readonly providerRepository: ProviderRepository,
    private readonly organizationMemberService: OrganizationMemberService,
    private readonly aircraftRepository: AircraftRepository,
    private readonly airportRepository: AirportRepository,
    private readonly notificationService: NotificationService,
  ) {}

  /** Public — chỉ Flight đã APPROVED. Khách tìm theo cặp sân bay đi/đến (Search SGN → HAN). */
  async list(query: ListFlightsDto) {
    const { page, limit, skip, take } = resolvePagination(query);

    const where: Prisma.FlightWhereInput = {
      deletedAt: null,
      status: FlightStatus.APPROVED,
      ...(query.departureAirportId && {
        departureAirportId: BigInt(query.departureAirportId),
      }),
      ...(query.arrivalAirportId && {
        arrivalAirportId: BigInt(query.arrivalAirportId),
      }),
    };

    const [items, totalItems] = await this.flightRepository.findMany(
      where,
      skip,
      take,
    );
    return buildPaginated(items, totalItems, page, limit);
  }

  async getById(id: bigint) {
    const flight = await this.flightRepository.findById(id);
    if (!flight || flight.status !== FlightStatus.APPROVED) {
      throw new NotFoundException('Flight not found');
    }
    return flight;
  }

  async listMine(userId: bigint, query: ListFlightsDto) {
    const provider = await this.getOwnedApprovedAirlineProvider(userId);
    const { page, limit, skip, take } = resolvePagination(query);

    const where: Prisma.FlightWhereInput = {
      deletedAt: null,
      providerId: provider.id,
      ...(query.status && { status: query.status }),
    };

    const [items, totalItems] = await this.flightRepository.findMany(
      where,
      skip,
      take,
    );
    return buildPaginated(items, totalItems, page, limit);
  }

  async listForModeration(query: ListFlightsDto) {
    const { page, limit, skip, take } = resolvePagination(query);

    const where: Prisma.FlightWhereInput = {
      deletedAt: null,
      ...(query.status && { status: query.status }),
    };

    const [items, totalItems] = await this.flightRepository.findMany(
      where,
      skip,
      take,
    );
    return buildPaginated(items, totalItems, page, limit);
  }

  async create(userId: bigint, dto: CreateFlightDto) {
    const provider =
      await this.getOwnedApprovedAirlineProviderForManage(userId);
    const aircraftId = BigInt(dto.aircraftId);
    const departureAirportId = BigInt(dto.departureAirportId);
    const arrivalAirportId = BigInt(dto.arrivalAirportId);

    await this.assertOwnedApprovedAircraft(provider.id, aircraftId);
    await this.assertDistinctAirports(departureAirportId, arrivalAirportId);

    return this.flightRepository.create({
      flightNumber: dto.flightNumber,
      duration: dto.duration,
      provider: { connect: { id: provider.id } },
      aircraft: { connect: { id: aircraftId } },
      departureAirport: { connect: { id: departureAirportId } },
      arrivalAirport: { connect: { id: arrivalAirportId } },
    });
  }

  async update(userId: bigint, flightId: bigint, dto: UpdateFlightDto) {
    const provider =
      await this.getOwnedApprovedAirlineProviderForManage(userId);
    const flight = await this.getOwnedFlight(provider.id, flightId);

    const data: Prisma.FlightUpdateInput = {
      ...(dto.flightNumber !== undefined && { flightNumber: dto.flightNumber }),
      ...(dto.duration !== undefined && { duration: dto.duration }),
    };

    if (dto.aircraftId !== undefined) {
      const aircraftId = BigInt(dto.aircraftId);
      await this.assertOwnedApprovedAircraft(provider.id, aircraftId);
      data.aircraft = { connect: { id: aircraftId } };
    }

    const departureAirportId =
      dto.departureAirportId !== undefined
        ? BigInt(dto.departureAirportId)
        : flight.departureAirportId;
    const arrivalAirportId =
      dto.arrivalAirportId !== undefined
        ? BigInt(dto.arrivalAirportId)
        : flight.arrivalAirportId;
    if (
      dto.departureAirportId !== undefined ||
      dto.arrivalAirportId !== undefined
    ) {
      await this.assertDistinctAirports(departureAirportId, arrivalAirportId);
      if (dto.departureAirportId !== undefined) {
        data.departureAirport = { connect: { id: departureAirportId } };
      }
      if (dto.arrivalAirportId !== undefined) {
        data.arrivalAirport = { connect: { id: arrivalAirportId } };
      }
    }

    return this.flightRepository.update(flight.id, data);
  }

  async remove(userId: bigint, flightId: bigint) {
    const provider =
      await this.getOwnedApprovedAirlineProviderForManage(userId);
    const flight = await this.getOwnedFlight(provider.id, flightId);
    await this.flightRepository.softDelete(flight.id);
  }

  async review(id: bigint, status: 'APPROVED' | 'REJECTED', reason?: string) {
    const flight = await this.flightRepository.findById(id);
    if (!flight) {
      throw new NotFoundException('Flight not found');
    }

    const updated = await this.flightRepository.updateStatus(id, status);

    const provider = await this.providerRepository.findById(flight.providerId);
    if (provider) {
      const rejectMessage = reason
        ? `Chuyến bay "${flight.flightNumber}" của bạn đã bị từ chối. Lý do: ${reason}`
        : `Chuyến bay "${flight.flightNumber}" của bạn đã bị từ chối. Vui lòng liên hệ quản trị viên để biết thêm chi tiết.`;

      await this.notificationService.notify(
        provider.userId,
        status === 'APPROVED'
          ? 'Chuyến bay đã được duyệt'
          : 'Chuyến bay bị từ chối',
        status === 'APPROVED'
          ? `Chuyến bay "${flight.flightNumber}" của bạn đã được duyệt và hiển thị công khai.`
          : rejectMessage,
      );
    }

    return updated;
  }

  private async assertOwnedApprovedAircraft(
    providerId: bigint,
    aircraftId: bigint,
  ) {
    const aircraft = await this.aircraftRepository.findById(aircraftId);
    if (!aircraft || aircraft.providerId !== providerId) {
      throw new NotFoundException('Aircraft not found');
    }
    if (aircraft.status !== AircraftStatus.APPROVED) {
      throw new BadRequestException(
        'Aircraft must be APPROVED before it can be used on a flight',
      );
    }
  }

  private async assertDistinctAirports(
    departureAirportId: bigint,
    arrivalAirportId: bigint,
  ) {
    if (departureAirportId === arrivalAirportId) {
      throw new BadRequestException(
        'Departure and arrival airport must be different',
      );
    }
    const [departure, arrival] = await Promise.all([
      this.airportRepository.findById(departureAirportId),
      this.airportRepository.findById(arrivalAirportId),
    ]);
    if (!departure) {
      throw new NotFoundException('Departure airport not found');
    }
    if (!arrival) {
      throw new NotFoundException('Arrival airport not found');
    }
  }

  /** Chỉ Provider type=FLIGHT đã APPROVED mới quản lý Flight — tách domain với các loại đối tác khác. */
  private async getOwnedApprovedAirlineProvider(userId: bigint) {
    const { provider } = await this.organizationMemberService.requireMembership(
      userId,
      {
        providerType: ProviderType.FLIGHT,
      },
    );
    return provider;
  }

  private async getOwnedApprovedAirlineProviderForManage(userId: bigint) {
    const { provider } = await this.organizationMemberService.requireMembership(
      userId,
      {
        providerType: ProviderType.FLIGHT,
        permission: 'flight:manage',
      },
    );
    return provider;
  }

  private async getOwnedFlight(providerId: bigint, flightId: bigint) {
    const flight = await this.flightRepository.findById(flightId);
    if (!flight) {
      throw new NotFoundException('Flight not found');
    }
    if (flight.providerId !== providerId) {
      throw new ForbiddenException('You do not own this flight');
    }
    return flight;
  }
}
