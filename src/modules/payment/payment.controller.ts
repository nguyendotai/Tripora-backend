import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { parseIdParam } from '../../shared/utils/parse-id';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentService } from './payment.service';

@ApiTags('Payment')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /** Stripe goi thang, khong qua JwtAuthGuard — xac thuc bang chu ky HMAC trong header
   * stripe-signature (backend/CLAUDE.md muc 3), khong phai Bearer token. */
  @Post('webhook')
  async webhook(@Req() req: RawBodyRequest<Request>, @Headers('stripe-signature') signature: string) {
    if (!req.rawBody || !signature) {
      throw new BadRequestException('Missing raw body or Stripe signature');
    }
    await this.paymentService.handleWebhook(req.rawBody, signature);
    return { received: true };
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getById(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.paymentService.getById(BigInt(user.id), parseIdParam(id));
  }

  @Post(':id/retry')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  retry(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.paymentService.retry(BigInt(user.id), parseIdParam(id));
  }
}
