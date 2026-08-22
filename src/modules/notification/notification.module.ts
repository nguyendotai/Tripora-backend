import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module';
import { NotificationController } from './notification.controller';
import { NotificationRepository } from './notification.repository';
import { NotificationService } from './notification.service';

@Module({
  imports: [RealtimeModule],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationRepository],
  exports: [NotificationService],
})
export class NotificationModule {}
