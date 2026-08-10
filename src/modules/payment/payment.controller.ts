import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';

@ApiTags('payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /** Endpoint riêng cho Payment Gateway gọi — xác thực bằng chữ ký (không dùng JWT), xem payment.md mục 5. */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  handleWebhook(@Body() dto: PaymentWebhookDto) {
    return this.paymentService.handleWebhook(dto);
  }
}
