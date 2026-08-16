import { SeatClass } from '@prisma/client';

const BUSINESS_LETTERS = 'ABCD';
const ECONOMY_LETTERS = 'ABCDEF';

function generateRows(
  capacity: number,
  letters: string,
  startRow: number,
): { seatNumbers: string[]; nextRow: number } {
  const seatNumbers: string[] = [];
  let row = startRow;
  while (seatNumbers.length < capacity) {
    for (const letter of letters) {
      if (seatNumbers.length >= capacity) break;
      seatNumbers.push(`${row}${letter}`);
    }
    row += 1;
  }
  return { seatNumbers, nextRow: row };
}

/** Sinh so hieu ghe kieu hang khong thuc te (hang so + chu cai) tu economy/businessCapacity cua Aircraft. */
export function generateSeatNumbers(
  businessCapacity: number,
  economyCapacity: number,
): { seatNumber: string; class: SeatClass }[] {
  const business = generateRows(businessCapacity, BUSINESS_LETTERS, 1);
  const economy = generateRows(economyCapacity, ECONOMY_LETTERS, business.nextRow + 1);

  return [
    ...business.seatNumbers.map((seatNumber) => ({ seatNumber, class: SeatClass.BUSINESS })),
    ...economy.seatNumbers.map((seatNumber) => ({ seatNumber, class: SeatClass.ECONOMY })),
  ];
}
