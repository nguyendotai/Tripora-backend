import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingDomain,
  BookingStatus,
  Prisma,
  ProviderType,
  TransportRouteStatus,
  VehicleStatus,
} from '@prisma/client';
import { CouponService } from '../coupon/coupon.service';
import { PaymentService } from '../payment/payment.service';
import { OrganizationMemberService } from '../provider/organization-member.service';
import { TransportRouteRepository } from '../transport-route/transport-route.repository';
import { TransportScheduleRepository } from '../transport-schedule/transport-schedule.repository';
import { VehicleRepository } from '../vehicle/vehicle.repository';
import {
  buildPaginated,
  resolvePagination,
} from '../../shared/utils/pagination';
import { groupBookingsByCustomer } from '../../shared/utils/group-bookings-by-customer';
import { CheckTransportAvailabilityDto } from './dto/check-transport-availability.dto';
import { CreateTransportBookingDto } from './dto/create-transport-booking.dto';
import { ListAllTransportBookingsDto } from './dto/list-all-transport-bookings.dto';
import { ListProviderTransportBookingsDto } from './dto/list-provider-transport-bookings.dto';
import { TransportBookingRepository } from './transport-booking.repository';

@Injectable()
export class TransportBookingService {
  constructor(
    private readonly transportBookingRepository: TransportBookingRepository,
    private readonly transportRouteRepository: TransportRouteRepository,
    private readonly vehicleRepository: VehicleRepository,
    private readonly transportScheduleRepository: TransportScheduleRepository,
    private readonly organizationMemberService: OrganizationMemberService,
    private readonly paymentService: PaymentService,
    private readonly couponService: CouponService,
  ) {}

  /** Public — xem con cho khong + bao gia truoc khi nhap Customer Info. */
  async checkAvailability(dto: CheckTransportAvailabilityDto) {
    const routeId = BigInt(dto.routeId);
    const vehicleId = BigInt(dto.vehicleId);
    const route = await this.getBookableRoute(routeId);
    await this.getBookableVehicle(vehicleId);
    const departureDate = this.parseDate(dto.departureDate);

    const schedule =
      await this.transportScheduleRepository.findByRouteVehicleAndDate(
        routeId,
        vehicleId,
        departureDate,
      );
    const available = !!schedule && schedule.available > 0;

    return {
      available,
      availableSeats: schedule?.available ?? 0,
      pricePerPerson: available
        ? (schedule.price ?? route.price).toString()
        : null,
      currency: route.currency,
    };
  }

  async create(userId: bigint, dto: CreateTransportBookingDto) {
    const routeId = BigInt(dto.routeId);
    const vehicleId = BigInt(dto.vehicleId);
    const route = await this.getBookableRoute(routeId);
    const vehicle = await this.getBookableVehicle(vehicleId);
    const departureDate = this.parseDate(dto.departureDate);

    if (dto.numberOfPeople > vehicle.capacity) {
      throw new BadRequestException(
        `This vehicle fits at most ${vehicle.capacity} people`,
      );
    }

    await this.couponService.validateCode(
      userId,
      BookingDomain.TRANSPORT,
      dto.couponCode,
    );

    const result = await this.transportBookingRepository.createBooking({
      userId,
      routeId,
      vehicleId,
      routeOrigin: route.origin,
      routeDestination: route.destination,
      vehicleName: vehicle.name,
      basePrice: route.price,
      currency: route.currency,
      departureDate,
      numberOfPeople: dto.numberOfPeople,
      customerName: dto.customerName,
      customerEmail: dto.customerEmail,
      customerPhone: dto.customerPhone,
    });

    if (!result.ok) {
      if (result.reason === 'MISSING_SCHEDULE') {
        throw new BadRequestException(
          'This route has no schedule for this vehicle/date yet',
        );
      }
      throw new ConflictException(
        'Not enough seats available for this departure date',
      );
    }

    const { discountAmount } = await this.couponService.applyDiscount({
      userId,
      bookingDomain: BookingDomain.TRANSPORT,
      bookingId: result.booking.id,
      subtotal: result.booking.totalPrice,
      couponCode: dto.couponCode,
      providerId: route.providerId,
    });

    const { checkoutUrl } = await this.paymentService.createForBooking({
      userId,
      bookingDomain: BookingDomain.TRANSPORT,
      bookingId: result.booking.id,
      amount: result.booking.totalPrice.sub(discountAmount),
      discountAmount,
      currency: result.booking.currency,
      description: `${route.origin} -> ${route.destination} (${dto.departureDate})`,
    });

    return { booking: result.booking, checkoutUrl };
  }

  /** Admin — xem toan bo TransportBooking, filter theo status (CONFIRMED/CANCELLED). */
  async listAll(query: ListAllTransportBookingsDto) {
    const { page, limit, skip, take } = resolvePagination(query);
    const where: Prisma.TransportBookingWhereInput = {
      ...(query.status && { status: query.status }),
    };

    const [items, totalItems] = await this.transportBookingRepository.findAll(
      where,
      skip,
      take,
    );
    return buildPaginated(items, totalItems, page, limit);
  }

  /** My Transport Bookings — status? = upcoming | completed | cancelled (bo trong la tat ca). */
  listMine(userId: bigint, status?: 'upcoming' | 'completed' | 'cancelled') {
    const today = this.today();
    return this.transportBookingRepository.findManyByUser(
      userId,
      status,
      today,
    );
  }

  /** Transport Operator — xem TransportBooking cua cac Route minh so huu, optional loc theo 1 Route. */
  async listMineAsProvider(
    userId: bigint,
    query: ListProviderTransportBookingsDto,
  ) {
    const { provider } = await this.organizationMemberService.requireMembership(
      userId,
      { providerType: ProviderType.TRANSPORT, permission: 'booking:view' },
    );

    const today = this.today();
    return this.transportBookingRepository.findManyByProvider(
      provider.id,
      query.routeId ? BigInt(query.routeId) : undefined,
      query.status,
      today,
    );
  }

  /** V7 vong 7 — Provider xem danh sach khach hang, nhom tu toan bo TransportBooking cua minh. */
  async listCustomersAsProvider(userId: bigint) {
    const { provider } = await this.organizationMemberService.requireMembership(
      userId,
      { providerType: ProviderType.TRANSPORT, permission: 'booking:view' },
    );

    const today = this.today();
    const bookings = await this.transportBookingRepository.findManyByProvider(
      provider.id,
      undefined,
      undefined,
      today,
    );
    return groupBookingsByCustomer(bookings);
  }

  /** Chi huy duoc booking CONFIRMED cua chinh minh va departureDate chua toi. */
  async cancel(userId: bigint, bookingId: bigint) {
    const booking = await this.transportBookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundException('Transport booking not found');
    }
    if (booking.userId !== userId) {
      throw new ForbiddenException('You do not own this booking');
    }
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('This booking is already cancelled');
    }

    const today = this.today();
    if (booking.departureDate <= today) {
      throw new BadRequestException(
        'Cannot cancel a booking that has already departed',
      );
    }

    const result = await this.transportBookingRepository.cancelBooking(
      bookingId,
      booking.routeId,
      booking.vehicleId,
      booking.departureDate,
      booking.numberOfPeople,
    );
    if (!result.ok) {
      throw new BadRequestException('This booking is already cancelled');
    }

    const refundResult = await this.paymentService.createRefundForBooking({
      userId,
      bookingDomain: BookingDomain.TRANSPORT,
      bookingId,
      startDate: booking.departureDate,
    });
    if (refundResult.refundPending) {
      result.booking.status = BookingStatus.REFUND_PENDING;
    }

    return result.booking;
  }

  /** Route phai APPROVED — cung luat public nhu Transport Route/Schedule. */
  private async getBookableRoute(routeId: bigint) {
    const route = await this.transportRouteRepository.findById(routeId);
    if (!route || route.status !== TransportRouteStatus.APPROVED) {
      throw new NotFoundException('Transport route not found');
    }
    return route;
  }

  /** Vehicle phai APPROVED — cung luat public nhu Vehicle. */
  private async getBookableVehicle(vehicleId: bigint) {
    const vehicle = await this.vehicleRepository.findById(vehicleId);
    if (!vehicle || vehicle.status !== VehicleStatus.APPROVED) {
      throw new NotFoundException('Vehicle not found');
    }
    return vehicle;
  }

  private parseDate(raw: string): Date {
    return new Date(`${raw}T00:00:00.000Z`);
  }

  private today(): Date {
    return new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
  }
}
