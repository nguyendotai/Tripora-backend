import { Module } from '@nestjs/common';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { DestinationModule } from '../destination/destination.module';
import { NotificationModule } from '../notification/notification.module';
import { ProviderModule } from '../provider/provider.module';
import { PropertyController } from './property.controller';
import { PropertyRepository } from './property.repository';
import { PropertyService } from './property.service';

@Module({
  imports: [
    DestinationModule,
    NotificationModule,
    ProviderModule,
    ActivityLogModule,
  ],
  controllers: [PropertyController],
  providers: [PropertyService, PropertyRepository],
  exports: [PropertyRepository],
})
export class PropertyModule {}
