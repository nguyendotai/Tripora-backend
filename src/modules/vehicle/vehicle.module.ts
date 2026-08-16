import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { ProviderModule } from '../provider/provider.module';
import { VehicleController } from './vehicle.controller';
import { VehicleRepository } from './vehicle.repository';
import { VehicleService } from './vehicle.service';

@Module({
  imports: [NotificationModule, ProviderModule],
  controllers: [VehicleController],
  providers: [VehicleService, VehicleRepository],
  exports: [VehicleRepository],
})
export class VehicleModule {}
