import { Module } from '@nestjs/common';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { DestinationModule } from '../destination/destination.module';
import { NotificationModule } from '../notification/notification.module';
import { ProviderModule } from '../provider/provider.module';
import { ExperienceController } from './experience.controller';
import { ExperienceRepository } from './experience.repository';
import { ExperienceService } from './experience.service';

@Module({
  imports: [
    DestinationModule,
    NotificationModule,
    ProviderModule,
    ActivityLogModule,
  ],
  controllers: [ExperienceController],
  providers: [ExperienceService, ExperienceRepository],
  exports: [ExperienceRepository],
})
export class ExperienceModule {}
