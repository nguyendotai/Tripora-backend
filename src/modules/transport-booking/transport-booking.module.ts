import { Module } from '@nestjs/common';
import { PaymentModule } from '../payment/payment.module';
import { ProviderModule } from '../provider/provider.module';
import { TransportRouteModule } from '../transport-route/transport-route.module';
import { TransportScheduleModule } from '../transport-schedule/transport-schedule.module';
import { VehicleModule } from '../vehicle/vehicle.module';
import { TransportBookingController } from './transport-booking.controller';
import { TransportBookingRepository } from './transport-booking.repository';
import { TransportBookingService } from './transport-booking.service';

@Module({
  imports: [TransportRouteModule, VehicleModule, TransportScheduleModule, ProviderModule, PaymentModule],
  controllers: [TransportBookingController],
  providers: [TransportBookingService, TransportBookingRepository],
  exports: [TransportBookingRepository],
})
export class TransportBookingModule {}
