export interface OccupancyDayPoint {
  date: string;
  capacity: number;
  booked: number;
  rate: number;
}

interface OccupancyRowForGrouping {
  date: string;
  capacity: number;
  booked: number;
}

/**
 * V9 vong 8 — Occupancy Provider. Mirror group-commissions-by-day.ts (Map theo date string, roi
 * zero-fill `days` phan tu tinh tu hom nay lui ve truoc) nhung cong so nguyen thuong (khong phai
 * Prisma.Decimal) va tinh them ty le lap day.
 */
export function groupOccupancyByDay(
  rows: OccupancyRowForGrouping[],
  days: number,
): OccupancyDayPoint[] {
  const byDate = new Map<string, { capacity: number; booked: number }>();
  for (const row of rows) {
    const existing = byDate.get(row.date);
    if (existing) {
      existing.capacity += row.capacity;
      existing.booked += row.booked;
    } else {
      byDate.set(row.date, { capacity: row.capacity, booked: row.booked });
    }
  }

  const today = new Date(
    `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`,
  );
  const points: OccupancyDayPoint[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - i);
    const key = date.toISOString().slice(0, 10);
    const bucket = byDate.get(key);
    const capacity = bucket?.capacity ?? 0;
    const booked = bucket?.booked ?? 0;
    points.push({
      date: key,
      capacity,
      booked,
      rate: capacity === 0 ? 0 : (booked / capacity) * 100,
    });
  }

  return points;
}
