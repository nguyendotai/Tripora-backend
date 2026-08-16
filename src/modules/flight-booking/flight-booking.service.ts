import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingDomain,
  FlightScheduleStatus,
  FlightSeatStatus,
  FlightStatus,
  Prisma,
  ProviderStatus,
  ProviderType,
  SeatClass,
} from '@prisma/client';
import { AirportRepository } from '../airport/airport.repository';
import { FlightSeatRepository } from '../flight-seat/flight-seat.repository';
import { PaymentService } from '../payment/payment.service';
import { ProviderRepository } from '../provider/provider.repository';
import { buildPaginated, resolvePagination } from '../../shared/utils/pagination';
import { CreateFlightBookingDto } from './dto/create-flight-booking.dto';
import { ListAllFlightBookingsDto } from './dto/list-all-flight-bookings.dto';
import { ListProviderFlightBookingsDto } from './dto/list-provider-flight-bookings.dto';
import { FlightBookingRepository } from './flight-booking.repository';

@Injectable()
export class FlightBookingService {
  constructor(
    private readonly flightBookingRepository: FlightBookingRepository,
    private readonly flightSeatRepository: FlightSeatRepository,
    private readonly airportRepository: AirportRepository,
    private readonly providerRepository: ProviderRepository,
    private readonly paymentService: PaymentService,
  ) {}

  /**
   * Search -> Select Flight -> Select Seat da xong o GET /flights + GET /flight-seats — buoc nay
   * la Passenger Info -> Booking -> E-ticket: nhan thang danh sach seatId da chon (khong can
   * endpoint "check availability" rieng nhu Transport, vi GET /flight-seats da the hien dung
   * ghe nao con AVAILABLE). E-ticket la chinh response FlightBooking tra ve (kem Passenger tren
   * tung ghe da dat) — khong sinh file/PDF, dung tinh than mock data cua ca du an.
   */
  async create(userId: bigint, dto: CreateFlightBookingDto) {
    if (dto.seatIds.length !== dto.passengers.length) {
      throw new BadRequestException('seatIds and passengers must have the same length');
    }

    const scheduleId = BigInt(dto.scheduleId);
    const seatIds = dto.seatIds.map((id) => BigInt(id));

    const schedule = await this.flightSeatRepository.findScheduleWithFlight(scheduleId);
    if (!schedule || schedule.flight.status !== FlightStatus.APPROVED) {
      throw new NotFoundException('Flight schedule not found');
    }
    if (schedule.status !== FlightScheduleStatus.SCHEDULED) {
      throw new BadRequestException('This schedule is not open for booking');
    }

    const seats = await this.flightSeatRepository.findByIds(seatIds);
    if (seats.length !== seatIds.length) {
      throw new NotFoundException('One or more selected seats do not exist');
    }
    const seatById = new Map(seats.map((seat) => [seat.id.toString(), seat]));

    let totalPrice = new Prisma.Decimal(0);
    for (const seatId of seatIds) {
      const seat = seatById.get(seatId.toString())!;
      if (seat.scheduleId !== scheduleId) {
        throw new BadRequestException('All selected seats must belong to the same schedule');
      }
      if (seat.status !== FlightSeatStatus.AVAILABLE) {
        throw new ConflictException('One or more selected seats are no longer available');
      }
      if (seat.class === SeatClass.BUSINESS) {
        if (schedule.businessPrice === null) {
          throw new BadRequestException('Business price is not set for this schedule');
        }
        totalPrice = totalPrice.add(schedule.businessPrice);
      } else {
        totalPrice = totalPrice.add(schedule.economyPrice);
      }
    }

    const [departureAirport, arrivalAirport] = await Promise.all([
      this.airportRepository.findById(schedule.flight.departureAirportId),
      this.airportRepository.findById(schedule.flight.arrivalAirportId),
    ]);
    if (!departureAirport || !arrivalAirport) {
      throw new NotFoundException('Flight airports not found');
    }

    const passengers = seatIds.map((seatId, index) => ({
      seatId,
      fullName: dto.passengers[index].fullName,
      idNumber: dto.passengers[index].idNumber,
    }));

    const result = await this.flightBookingRepository.createBooking({
      userId,
      scheduleId,
      seatIds,
      passengers,
      flightNumber: schedule.flight.flightNumber,
      departureAirportCode: departureAirport.code,
      arrivalAirportCode: arrivalAirport.code,
      departureDate: schedule.departureDate,
      departureTime: schedule.departureTime,
      arrivalTime: schedule.arrivalTime,
      totalPrice,
      currency: 'VND',
      customerName: dto.customerName,
      customerEmail: dto.customerEmail,
      customerPhone: dto.customerPhone,
    });

    if (!result.ok) {
      throw new ConflictException('One or more selected seats are no longer available');
    }

    const { checkoutUrl } = await this.paymentService.createForBooking({
      userId,
      bookingDomain: BookingDomain.FLIGHT,
      bookingId: result.booking.id,
      amount: totalPrice,
      currency: 'VND',
      description: `Flight: ${schedule.flight.flightNumber} (${departureAirport.code} -> ${arrivalAirport.code})`,
    });

    return { booking: result.booking, checkoutUrl };
  }

  /** Admin — xem toan bo FlightBooking, filter theo status (CONFIRMED/CANCELLED). */
  async listAll(query: ListAllFlightBookingsDto) {
    const { page, limit, skip, take } = resolvePagination(query);
    const where: Prisma.FlightBookingWhereInput = {
      ...(query.status && { status: query.status }),
    };

    const [items, totalItems] = await this.flightBookingRepository.findAll(where, skip, take);
    return buildPaginated(items, totalItems, page, limit);
  }

  /** My Flight Bookings — status? = upcoming | completed | cancelled (bo trong la tat ca). */
  listMine(userId: bigint, status?: 'upcoming' | 'completed' | 'cancelled') {
    const today = this.today();
    return this.flightBookingRepository.findManyByUser(userId, status, today);
  }

  /** Airline Provider — xem FlightBooking cua cac Flight minh so huu, optional loc theo 1 Flight. */
  async listMineAsProvider(userId: bigint, query: ListProviderFlightBookingsDto) {
    const provider = await this.providerRepository.findByUserId(userId);
    if (
      !provider ||
      provider.status !== ProviderStatus.APPROVED ||
      provider.type !== ProviderType.FLIGHT
    ) {
      throw new ForbiddenException('You need an approved airline profile to do this');
    }

    const today = this.today();
    return this.flightBookingRepository.findManyByProvider(
      provider.id,
      query.flightId ? BigInt(query.flightId) : undefined,
      query.status,
      today,
    );
  }

  /** Chi huy duoc booking CONFIRMED cua chinh minh va departureDate chua toi. */
  async cancel(userId: bigint, bookingId: bigint) {
    const booking = await this.flightBookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundException('Flight booking not found');
    }
    if (booking.userId !== userId) {
      throw new ForbiddenException('You do not own this booking');
    }
    if (booking.status !== 'CONFIRMED') {
      throw new BadRequestException('This booking is already cancelled');
    }

    const today = this.today();
    if (booking.departureDate <= today) {
      throw new BadRequestException('Cannot cancel a booking that has already departed');
    }

    const seatIds = booking.passengers.map((passenger) => passenger.seatId);
    const result = await this.flightBookingRepository.cancelBooking(bookingId, seatIds);
    if (!result.ok) {
      throw new BadRequestException('This booking is already cancelled');
    }
    return result.booking;
  }

  private today(): Date {
    return new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
  }
}
