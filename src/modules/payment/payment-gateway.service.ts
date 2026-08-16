import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import Stripe from 'stripe';

export interface CreateCheckoutSessionParams {
  paymentId: bigint;
  amount: Prisma.Decimal;
  currency: string;
  description: string;
}

export interface CheckoutSessionResult {
  sessionId: string;
  url: string;
}

/** Boc Stripe SDK (Checkout Session — trang thanh toan Stripe host san, khong tu dung form nhap
 * the). Chi noi duy nhat trong module goi ra Stripe that, de de thay bang gateway khac sau nay
 * ma khong dong toi PaymentService/Repository. */
@Injectable()
export class PaymentGatewayService {
  private readonly stripe: Stripe;

  constructor(private readonly config: ConfigService) {
    this.stripe = new Stripe(this.config.get<string>('STRIPE_SECRET_KEY') ?? '');
  }

  /** VND nam trong danh sach "zero-decimal currency" cua Stripe — unit_amount truyen thang
   * bang amount, khong nhan 100 nhu USD. metadata.paymentId de webhook tra nguoc dung Payment
   * khong can luu/tra cuu qua transactionId. */
  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSessionResult> {
    const successUrl = `${this.config.get<string>('STRIPE_SUCCESS_URL')}?paymentId=${params.paymentId}`;
    const cancelUrl = `${this.config.get<string>('STRIPE_CANCEL_URL')}?paymentId=${params.paymentId}`;

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: params.currency.toLowerCase(),
            product_data: { name: params.description },
            unit_amount: Math.round(Number(params.amount)),
          },
          quantity: 1,
        },
      ],
      metadata: { paymentId: params.paymentId.toString() },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    if (!session.url) {
      throw new Error('Stripe did not return a Checkout Session URL');
    }
    return { sessionId: session.id, url: session.url };
  }

  /** Nem loi neu chu ky sai — cam nhan payload chua verify (backend/CLAUDE.md muc 3 "Payment
   * Verify"). rawBody bat buoc phai la Buffer that (Stripe ky tren raw bytes, khong phai JSON
   * da parse). */
  constructEvent(rawBody: Buffer, signature: string): Stripe.Event {
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET') ?? '';
    return this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  }
}
