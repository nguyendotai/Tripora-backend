import { Injectable } from '@nestjs/common';
import { BookingDomain, Commission, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

/**
 * Raw SQL 1 lan tra ve providerId theo dung bookingId cua tung domain — khong qua Repository cua
 * domain do de tranh circular dependency (CommissionModule duoc PaymentModule import, khong duoc
 * phep import nguoc bat ky module Booking nao, cung triet ly voi PaymentModule/DOMAIN_TABLE).
 * HOTEL da co san propertyId snapshot ngay tren hotel_bookings nen chi can 1 join; TOUR/EXPERIENCE/
 * TRANSPORT co providerId truc tiep tren entity cha; FLIGHT can 2 join qua FlightSchedule.
 */
const PROVIDER_LOOKUP_SQL: Record<BookingDomain, string> = {
  HOTEL: `SELECT p.provider_id AS providerId FROM hotel_bookings hb JOIN properties p ON hb.property_id = p.id WHERE hb.id = ?`,
  TOUR: `SELECT t.provider_id AS providerId FROM tour_bookings tb JOIN tours t ON tb.tour_id = t.id WHERE tb.id = ?`,
  EXPERIENCE: `SELECT e.provider_id AS providerId FROM experience_bookings eb JOIN experiences e ON eb.experience_id = e.id WHERE eb.id = ?`,
  TRANSPORT: `SELECT tr.provider_id AS providerId FROM transport_bookings tb JOIN transport_routes tr ON tb.route_id = tr.id WHERE tb.id = ?`,
  FLIGHT: `SELECT f.provider_id AS providerId FROM flight_bookings fb JOIN flight_schedules fs ON fb.schedule_id = fs.id JOIN flights f ON fs.flight_id = f.id WHERE fb.id = ?`,
};

export interface CreateCommissionParams {
  providerId: bigint;
  paymentId: bigint;
  bookingDomain: BookingDomain;
  bookingId: bigint;
  grossAmount: Prisma.Decimal;
  rate: Prisma.Decimal;
  platformAmount: Prisma.Decimal;
  providerAmount: Prisma.Decimal;
}

@Injectable()
export class CommissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async resolveProviderId(
    bookingDomain: BookingDomain,
    bookingId: bigint,
  ): Promise<bigint | null> {
    const sql = PROVIDER_LOOKUP_SQL[bookingDomain];
    const rows = await this.prisma.$queryRawUnsafe<{ providerId: bigint }[]>(
      sql,
      bookingId,
    );
    return rows[0]?.providerId ?? null;
  }

  getCommissionRate(providerId: bigint): Promise<Prisma.Decimal | null> {
    return this.prisma.provider
      .findUnique({
        where: { id: providerId },
        select: { commissionRate: true },
      })
      .then((provider) => provider?.commissionRate ?? null);
  }

  create(params: CreateCommissionParams): Promise<Commission> {
    return this.prisma.commission.create({
      data: {
        providerId: params.providerId,
        paymentId: params.paymentId,
        bookingDomain: params.bookingDomain,
        bookingId: params.bookingId,
        grossAmount: params.grossAmount,
        rate: params.rate,
        platformAmount: params.platformAmount,
        providerAmount: params.providerAmount,
      },
    });
  }

  /** Admin can thay ten/loai Provider, khong chi providerId tho — them include. */
  async findAll(
    where: Prisma.CommissionWhereInput,
    skip: number,
    take: number,
  ): Promise<
    [
      Prisma.CommissionGetPayload<{
        include: { provider: { select: { name: true; type: true } } };
      }>[],
      number,
    ]
  > {
    return this.prisma.$transaction([
      this.prisma.commission.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { provider: { select: { name: true, type: true } } },
      }),
      this.prisma.commission.count({ where }),
    ]);
  }
}
