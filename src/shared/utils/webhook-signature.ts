import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Xác thực chữ ký Webhook Payment Gateway — placeholder HMAC-SHA256 dùng chung 1 secret
 * (PAYMENT_WEBHOOK_SECRET) cho tới khi tích hợp Gateway thật (VNPAY/Momo/Stripe, xem
 * backend/CLAUDE.md mục 1). Payload ký theo thứ tự cố định, xem payment.controller.ts.
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const expected = createHmac('sha256', secret).update(payload).digest('hex');

  const expectedBuffer = Buffer.from(expected, 'hex');
  const signatureBuffer = Buffer.from(signature, 'hex');

  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, signatureBuffer);
}
