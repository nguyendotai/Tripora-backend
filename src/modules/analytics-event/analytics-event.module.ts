import { Module } from '@nestjs/common';
import { AnalyticsEventController } from './analytics-event.controller';
import { AnalyticsEventRepository } from './analytics-event.repository';
import { AnalyticsEventService } from './analytics-event.service';

@Module({
  controllers: [AnalyticsEventController],
  providers: [AnalyticsEventService, AnalyticsEventRepository],
})
export class AnalyticsEventModule {}
