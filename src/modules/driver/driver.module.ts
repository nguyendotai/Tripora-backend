import { Module } from '@nestjs/common';
import { ProviderModule } from '../provider/provider.module';
import { TransportBookingModule } from '../transport-booking/transport-booking.module';
import { TransportRouteModule } from '../transport-route/transport-route.module';
import { DriverController } from './driver.controller';
import { DriverRepository } from './driver.repository';
import { DriverService } from './driver.service';

@Module({
  imports: [ProviderModule, TransportBookingModule, TransportRouteModule],
  controllers: [DriverController],
  providers: [DriverService, DriverRepository],
  exports: [DriverRepository],
})
export class DriverModule {}
