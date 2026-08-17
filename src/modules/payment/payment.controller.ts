import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { Role } from '@prisma/client';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { parseIdParam } from '../../shared/utils/parse-id';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ListAllPaymentsDto } from './dto/list-all-payments.dto';
import { ListMyPaymentsDto } from './dto/list-my-payments.dto';
import { PaymentService } from './payment.service';

@ApiTags('Payment')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /** Stripe goi thang, khong qua JwtAuthGuard — xac thuc bang chu ky HMAC trong header
   * stripe-signature (backend/CLAUDE.md muc 3), khong phai Bearer token. */
  @Post('webhook')
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!req.rawBody || !signature) {
      throw new BadRequestException('Missing raw body or Stripe signature');
    }
    await this.paymentService.handleWebhook(req.rawBody, signature);
    return { received: true };
  }

  /** Transaction history — dat truoc :id de tranh Nest khop nham "mine" thanh 1 id
   * (da tung gap bug nay o TourGuideController, xem CHANGELOG). */
  @Get('mine')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  listMine(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: ListMyPaymentsDto,
  ) {
    return this.paymentService.listMine(BigInt(user.id), query);
  }

  /** Admin — Finance Dashboard, xem toan bo Payment (kem Invoice/Refund). Dat sau 'mine' cung ly
   * do da ghi tren — khong co param nen khong that su xung dot voi :id, nhung giu thu tu nay de
   * nhat quan/de doc. */
  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  listAll(@Query() query: ListAllPaymentsDto) {
    return this.paymentService.listAll(query);
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
