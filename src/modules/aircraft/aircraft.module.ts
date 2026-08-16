import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { ProviderModule } from '../provider/provider.module';
import { AircraftController } from './aircraft.controller';
import { AircraftRepository } from './aircraft.repository';
import { AircraftService } from './aircraft.service';

@Module({
  imports: [NotificationModule, ProviderModule],
  controllers: [AircraftController],
  providers: [AircraftService, AircraftRepository],
  exports: [AircraftRepository],
})
export class AircraftModule {}
