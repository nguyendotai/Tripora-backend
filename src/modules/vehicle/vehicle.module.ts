import { Module } from '@nestjs/common';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { NotificationModule } from '../notification/notification.module';
import { ProviderModule } from '../provider/provider.module';
import { VehicleController } from './vehicle.controller';
import { VehicleRepository } from './vehicle.repository';
import { VehicleService } from './vehicle.service';

@Module({
  imports: [NotificationModule, ProviderModule, ActivityLogModule],
  controllers: [VehicleController],
  providers: [VehicleService, VehicleRepository],
  exports: [VehicleRepository],
})
export class VehicleModule {}
