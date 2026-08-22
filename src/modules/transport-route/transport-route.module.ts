import { Module } from '@nestjs/common';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { NotificationModule } from '../notification/notification.module';
import { ProviderModule } from '../provider/provider.module';
import { TransportRouteController } from './transport-route.controller';
import { TransportRouteRepository } from './transport-route.repository';
import { TransportRouteService } from './transport-route.service';

@Module({
  imports: [NotificationModule, ProviderModule, ActivityLogModule],
  controllers: [TransportRouteController],
  providers: [TransportRouteService, TransportRouteRepository],
  exports: [TransportRouteRepository],
})
export class TransportRouteModule {}
