import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module';
import { NotificationController } from './notification.controller';
import { NotificationProcessor } from './notification.processor';
import { NotificationRepository } from './notification.repository';
import { NotificationService } from './notification.service';

/** V9 vong 5 — RealtimeModule gio duoc NotificationProcessor dung (khong phai NotificationService
 * nua) de emit realtime sau khi worker xu ly job xong. */
@Module({
  imports: [RealtimeModule, BullModule.registerQueue({ name: 'notification' })],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationRepository, NotificationProcessor],
  exports: [NotificationService],
})
export class NotificationModule {}
