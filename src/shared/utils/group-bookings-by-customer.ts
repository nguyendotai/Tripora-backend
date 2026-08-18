import { Prisma } from '@prisma/client';

export interface ProviderCustomerSummary {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  totalBookings: number;
  totalSpent: Prisma.Decimal;
  lastBookingAt: Date;
}

interface BookingForGrouping {
  userId: bigint;
  totalPrice: Prisma.Decimal;
  createdAt: Date;
  user: { email: string; firstName: string | null; lastName: string | null };
}

/**
 * V7 vong 7 — dung chung cho ca 5 domain Booking de dung trang "Customers" cua Provider.
 * Nhom bang Map o tang JS thay vi Prisma groupBy vi groupBy khong ho tro include (khong lay duoc
 * ten/email User kem theo) va project chua tung dung groupBy voi nested relation filter.
 */
export function groupBookingsByCustomer(
  bookings: BookingForGrouping[],
): ProviderCustomerSummary[] {
  const grouped = new Map<string, ProviderCustomerSummary>();

  for (const booking of bookings) {
    const key = booking.userId.toString();
    const existing = grouped.get(key);
    if (existing) {
      existing.totalBookings += 1;
      existing.totalSpent = existing.totalSpent.add(booking.totalPrice);
      if (booking.createdAt > existing.lastBookingAt) {
        existing.lastBookingAt = booking.createdAt;
      }
    } else {
      grouped.set(key, {
        userId: key,
        email: booking.user.email,
        firstName: booking.user.firstName,
        lastName: booking.user.lastName,
        totalBookings: 1,
        totalSpent: booking.totalPrice,
        lastBookingAt: booking.createdAt,
      });
    }
  }

  return Array.from(grouped.values()).sort(
    (a, b) => b.lastBookingAt.getTime() - a.lastBookingAt.getTime(),
  );
}
