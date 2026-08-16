import { Module } from '@nestjs/common';
import { ProviderModule } from '../provider/provider.module';
import { TransportRouteModule } from '../transport-route/transport-route.module';
import { VehicleModule } from '../vehicle/vehicle.module';
import { TransportScheduleController } from './transport-schedule.controller';
import { TransportScheduleRepository } from './transport-schedule.repository';
import { TransportScheduleService } from './transport-schedule.service';

@Module({
  imports: [TransportRouteModule, VehicleModule, ProviderModule],
  controllers: [TransportScheduleController],
  providers: [TransportScheduleService, TransportScheduleRepository],
  exports: [TransportScheduleRepository],
})
export class TransportScheduleModule {}
