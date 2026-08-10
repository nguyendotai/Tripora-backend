import { IsEnum, IsNumber, IsPositive, IsString, Matches } from 'class-validator';

export enum WebhookPaymentStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export class PaymentWebhookDto {
  @IsString()
  @Matches(/^\d+$/, { message: 'bookingId must be numeric' })
  bookingId: string;

  @IsString()
  transactionId: string;

  @IsString()
  provider: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsEnum(WebhookPaymentStatus)
  status: WebhookPaymentStatus;

  @IsString()
  signature: string;
}
