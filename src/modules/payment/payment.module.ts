import { Module } from '@nestjs/common';
import { CommissionModule } from '../commission/commission.module';
import { NotificationModule } from '../notification/notification.module';
import { PaymentController } from './payment.controller';
import { PaymentGatewayService } from './payment-gateway.service';
import { PaymentRepository } from './payment.repository';
import { PaymentService } from './payment.service';

/** Co tinh khong import bat ky module Booking nao (Hotel/Tour/Experience/Transport/Flight) —
 * flip status Booking luc webhook thanh cong dung raw SQL qua bang map trong PaymentRepository
 * (khong qua Repository/Service cua tung domain) de tranh circular dependency, vi ca 5 module
 * Booking deu can import nguoc PaymentModule (goi createForBooking luc tao Booking). Mirror dung
 * cach FlightSeatModule da tranh circular voi FlightScheduleModule o V5. CommissionModule cung
 * khong import Booking nao nen import 1 chieu vao day an toan, khong tao vong lap. */
@Module({
  imports: [NotificationModule, CommissionModule],
  controllers: [PaymentController],
  providers: [PaymentService, PaymentRepository, PaymentGatewayService],
  exports: [PaymentService, PaymentRepository],
})
export class PaymentModule {}
