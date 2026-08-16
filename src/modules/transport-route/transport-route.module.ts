import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { ProviderModule } from '../provider/provider.module';
import { TransportRouteController } from './transport-route.controller';
import { TransportRouteRepository } from './transport-route.repository';
import { TransportRouteService } from './transport-route.service';

@Module({
  imports: [NotificationModule, ProviderModule],
  controllers: [TransportRouteController],
  providers: [TransportRouteService, TransportRouteRepository],
  exports: [TransportRouteRepository],
})
export class TransportRouteModule {}
