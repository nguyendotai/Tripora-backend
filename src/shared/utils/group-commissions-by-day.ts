import { Prisma } from '@prisma/client';

export interface CommissionDayPoint {
  date: string;
  totalRevenue: Prisma.Decimal;
  totalBookings: number;
}

interface CommissionForGrouping {
  createdAt: Date;
  providerAmount: Prisma.Decimal;
}

/**
 * V7 vong 8 — dung cho trang Analytics cua Provider. Nhom bang Map o tang JS (cung triet ly voi
 * group-bookings-by-customer.ts vong 7) vi Prisma groupBy chi group theo cot tho, khong ho tro
 * group theo expression nhu DATE(created_at). Tra ve dung `days` phan tu tinh tu hom nay lui ve
 * truoc (zero-fill ngay khong co giao dich) de chart khong bi dut doan.
 */
export function groupCommissionsByDay(
  commissions: CommissionForGrouping[],
  days: number,
): CommissionDayPoint[] {
  const byDate = new Map<
    string,
    { totalRevenue: Prisma.Decimal; totalBookings: number }
  >();
  for (const commission of commissions) {
    const key = commission.createdAt.toISOString().slice(0, 10);
    const existing = byDate.get(key);
    if (existing) {
      existing.totalRevenue = existing.totalRevenue.add(
        commission.providerAmount,
      );
      existing.totalBookings += 1;
    } else {
      byDate.set(key, {
        totalRevenue: commission.providerAmount,
        totalBookings: 1,
      });
    }
  }

  const today = new Date(
    `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`,
  );
  const points: CommissionDayPoint[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - i);
    const key = date.toISOString().slice(0, 10);
    const bucket = byDate.get(key);
    points.push({
      date: key,
      totalRevenue: bucket?.totalRevenue ?? new Prisma.Decimal(0),
      totalBookings: bucket?.totalBookings ?? 0,
    });
  }

  return points;
}
