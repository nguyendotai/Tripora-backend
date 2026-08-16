import { Injectable, NotFoundException } from '@nestjs/common';
import { FlightStatus } from '@prisma/client';
import { FlightSeatRepository } from './flight-seat.repository';

@Injectable()
export class FlightSeatService {
  constructor(private readonly flightSeatRepository: FlightSeatRepository) {}

  /** Public — chỉ khi Flight cha đã APPROVED. Dùng cho bước "Select Seat". */
  async list(scheduleId: bigint) {
    const schedule = await this.flightSeatRepository.findScheduleWithFlight(scheduleId);
    if (!schedule || schedule.flight.status !== FlightStatus.APPROVED) {
      throw new NotFoundException('Flight schedule not found');
    }
    return this.flightSeatRepository.findByScheduleId(scheduleId);
  }
}
