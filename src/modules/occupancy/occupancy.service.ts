import { Injectable } from '@nestjs/common';
import { ProviderType } from '@prisma/client';
import { ExperienceScheduleRepository } from '../experience-schedule/experience-schedule.repository';
import { FlightSeatRepository } from '../flight-seat/flight-seat.repository';
import { OrganizationMemberService } from '../provider/organization-member.service';
import { RoomInventoryRepository } from '../room-inventory/room-inventory.repository';
import { TourScheduleRepository } from '../tour-schedule/tour-schedule.repository';
import { TransportScheduleRepository } from '../transport-schedule/transport-schedule.repository';
import {
  groupOccupancyByDay,
  OccupancyDayPoint,
} from '../../shared/utils/group-occupancy-by-day';

const OCCUPANCY_DAYS = 30;

interface OccupancyRow {
  date: string;
  capacity: number;
  booked: number;
}

@Injectable()
export class OccupancyService {
  constructor(
    private readonly organizationMemberService: OrganizationMemberService,
    private readonly roomInventoryRepository: RoomInventoryRepository,
    private readonly tourScheduleRepository: TourScheduleRepository,
    private readonly experienceScheduleRepository: ExperienceScheduleRepository,
    private readonly transportScheduleRepository: TransportScheduleRepository,
    private readonly flightSeatRepository: FlightSeatRepository,
  ) {}

  /**
   * V9 vong 8 — Provider.type la 1 gia tri duy nhat, khop 1-1 voi 5 domain inventory, nen chi can
   * dispatch dung 1 query thay vi tinh ca 5 domain cho moi Provider. Mirror
   * CommissionService.getMyAnalytics ve cua so 30 ngay + permission 'finance:view' (cung trang
   * /my-overview, khong them permission moi cho 1 metric hien thi chung).
   */
  async getMine(userId: bigint): Promise<OccupancyDayPoint[]> {
    const { provider } = await this.organizationMemberService.requireMembership(
      userId,
      { permission: 'finance:view' },
    );

    const today = new Date(
      `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`,
    );
    const since = new Date(today);
    since.setUTCDate(since.getUTCDate() - (OCCUPANCY_DAYS - 1));

    const rows = await this.getRows(provider.id, provider.type, since);
    return groupOccupancyByDay(rows, OCCUPANCY_DAYS);
  }

  private async getRows(
    providerId: bigint,
    type: ProviderType,
    since: Date,
  ): Promise<OccupancyRow[]> {
    switch (type) {
      case ProviderType.HOTEL: {
        const rows = await this.roomInventoryRepository.findByProviderSince(
          providerId,
          since,
        );
        return rows.map((row) => ({
          date: row.date.toISOString().slice(0, 10),
          capacity: row.totalRooms,
          booked: row.bookedRooms,
        }));
      }
      case ProviderType.TOUR: {
        const rows = await this.tourScheduleRepository.findByProviderSince(
          providerId,
          since,
        );
        return rows.map((row) => ({
          date: row.departureDate.toISOString().slice(0, 10),
          capacity: row.capacity,
          booked: row.booked,
        }));
      }
      case ProviderType.ACTIVITY: {
        const rows =
          await this.experienceScheduleRepository.findByProviderSince(
            providerId,
            since,
          );
        return rows.map((row) => ({
          date: row.departureDate.toISOString().slice(0, 10),
          capacity: row.capacity,
          booked: row.booked,
        }));
      }
      case ProviderType.TRANSPORT: {
        const rows = await this.transportScheduleRepository.findByProviderSince(
          providerId,
          since,
        );
        return rows.map((row) => ({
          date: row.departureDate.toISOString().slice(0, 10),
          capacity: row.capacity,
          booked: row.booked,
        }));
      }
      case ProviderType.FLIGHT: {
        const seats = await this.flightSeatRepository.findByProviderSince(
          providerId,
          since,
        );
        const byDate = new Map<string, { capacity: number; booked: number }>();
        for (const seat of seats) {
          const key = seat.schedule.departureDate.toISOString().slice(0, 10);
          const bucket = byDate.get(key) ?? { capacity: 0, booked: 0 };
          bucket.capacity += 1;
          if (seat.status === 'BOOKED') bucket.booked += 1;
          byDate.set(key, bucket);
        }
        return [...byDate.entries()].map(([date, { capacity, booked }]) => ({
          date,
          capacity,
          booked,
        }));
      }
      default:
        return [];
    }
  }
}
