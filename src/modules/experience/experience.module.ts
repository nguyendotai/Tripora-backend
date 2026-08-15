import { Module } from '@nestjs/common';
import { DestinationModule } from '../destination/destination.module';
import { NotificationModule } from '../notification/notification.module';
import { ProviderModule } from '../provider/provider.module';
import { ExperienceController } from './experience.controller';
import { ExperienceRepository } from './experience.repository';
import { ExperienceService } from './experience.service';

@Module({
  imports: [DestinationModule, NotificationModule, ProviderModule],
  controllers: [ExperienceController],
  providers: [ExperienceService, ExperienceRepository],
  exports: [ExperienceRepository],
})
export class ExperienceModule {}
