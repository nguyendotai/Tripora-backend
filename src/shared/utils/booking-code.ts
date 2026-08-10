import { randomBytes } from 'crypto';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // bỏ ký tự dễ nhầm (0/O, 1/I)

/** Sinh mã Booking dạng TRV-XXXXXX (6 ký tự alphanumeric viết hoa) — xem specs/booking.md mục 2. */
export function generateBookingCode(): string {
  const bytes = randomBytes(6);
  let suffix = '';
  for (const byte of bytes) {
    suffix += CODE_CHARS[byte % CODE_CHARS.length];
  }
  return `TRV-${suffix}`;
}
