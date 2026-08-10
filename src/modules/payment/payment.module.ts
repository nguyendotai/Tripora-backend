import { Module } from '@nestjs/common';
import { RoomAvailabilityModule } from '../room-availability/room-availability.module';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';

@Module({
  imports: [RoomAvailabilityModule],
  controllers: [PaymentController],
  providers: [PaymentService],
})
export class PaymentModule {}
