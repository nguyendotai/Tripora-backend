import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FlightStatus, ProviderType } from '@prisma/client';
import { AircraftRepository } from '../aircraft/aircraft.repository';
import { FlightRepository } from '../flight/flight.repository';
import { generateSeatNumbers } from '../flight-seat/generate-seat-numbers';
import { FlightSeatRepository } from '../flight-seat/flight-seat.repository';
import { OrganizationMemberService } from '../provider/organization-member.service';
import { FlightScheduleRepository } from './flight-schedule.repository';
import { ListFlightSchedulesDto } from './dto/list-flight-schedules.dto';
import { SetFlightScheduleDto } from './dto/set-flight-schedule.dto';

const MAX_RANGE_DAYS = 90;

@Injectable()
export class FlightScheduleService {
  constructor(
    private readonly flightScheduleRepository: FlightScheduleRepository,
    private readonly flightRepository: FlightRepository,
    private readonly aircraftRepository: AircraftRepository,
    private readonly flightSeatRepository: FlightSeatRepository,
    private readonly organizationMemberService: OrganizationMemberService,
  ) {}

  /** Public — chỉ khi Flight đã APPROVED. */
  async list(query: ListFlightSchedulesDto) {
    const flightId = BigInt(query.flightId);
    const flight = await this.flightRepository.findById(flightId);
    if (!flight || flight.status !== FlightStatus.APPROVED) {
      throw new NotFoundException('Flight not found');
    }

    const { startDate, endDate } = this.parseRange(
      query.startDate,
      query.endDate,
    );
    return this.flightScheduleRepository.findByFlightAndDateRange(
      flightId,
      startDate,
      endDate,
    );
  }

  async listMine(userId: bigint, query: ListFlightSchedulesDto) {
    const flightId = BigInt(query.flightId);
    await this.getOwnedFlight(userId, flightId);

    const { startDate, endDate } = this.parseRange(
      query.startDate,
      query.endDate,
    );
    return this.flightScheduleRepository.findByFlightAndDateRange(
      flightId,
      startDate,
      endDate,
    );
  }

  async set(userId: bigint, dto: SetFlightScheduleDto) {
    const flightId = BigInt(dto.flightId);
    const flight = await this.getOwnedFlightForManage(userId, flightId);

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

    // Sinh san danh sach so hieu ghe 1 lan (giong nhau cho moi ngay moi trong khoang, vi cung 1
    // Aircraft) — chi dung khi tao FlightSchedule MOI, khong sinh lai khi set lai lich cu (ve
    // flight-schedule.module.ts: FlightSeatModule khong phu thuoc nguoc lai module nay).
    const aircraft = await this.aircraftRepository.findById(flight.aircraftId);
    if (!aircraft) {
      throw new NotFoundException('Aircraft not found');
    }
    const seatNumbers = generateSeatNumbers(
      aircraft.businessCapacity,
      aircraft.economyCapacity,
    );

    const results = [];
    for (let i = 0; i < dayCount; i += 1) {
      const departureDate = new Date(startDate);
      departureDate.setUTCDate(departureDate.getUTCDate() + i);

      const existing = await this.flightScheduleRepository.findByFlightAndDate(
        flightId,
        departureDate,
      );
      if (existing) {
        const updated = await this.flightScheduleRepository.update(
          existing.id,
          {
            departureTime: dto.departureTime,
            arrivalTime: dto.arrivalTime,
            economyPrice: dto.economyPrice,
            businessPrice: dto.businessPrice,
          },
        );
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
        await this.flightSeatRepository.createMany(created.id, seatNumbers);
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

  private async getOwnedFlight(userId: bigint, flightId: bigint) {
    const { provider } = await this.organizationMemberService.requireMembership(
      userId,
      {
        providerType: ProviderType.FLIGHT,
      },
    );
    const flight = await this.flightRepository.findById(flightId);
    if (!flight) {
      throw new NotFoundException('Flight not found');
    }
    if (flight.providerId !== provider.id) {
      throw new ForbiddenException('You do not own this flight');
    }
    return flight;
  }

  private async getOwnedFlightForManage(userId: bigint, flightId: bigint) {
    const { provider } = await this.organizationMemberService.requireMembership(
      userId,
      {
        providerType: ProviderType.FLIGHT,
        permission: 'flight:manage',
      },
    );
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
