import { Module } from '@nestjs/common';
import { ExperienceModule } from '../experience/experience.module';
import { ProviderModule } from '../provider/provider.module';
import { ExperienceScheduleController } from './experience-schedule.controller';
import { ExperienceScheduleRepository } from './experience-schedule.repository';
import { ExperienceScheduleService } from './experience-schedule.service';

@Module({
  imports: [ExperienceModule, ProviderModule],
  controllers: [ExperienceScheduleController],
  providers: [ExperienceScheduleService, ExperienceScheduleRepository],
  exports: [ExperienceScheduleRepository],
})
export class ExperienceScheduleModule {}
