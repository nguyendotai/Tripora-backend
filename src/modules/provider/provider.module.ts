import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { ProviderController } from './provider.controller';
import { ProviderRepository } from './provider.repository';
import { ProviderService } from './provider.service';

@Module({
  imports: [NotificationModule],
  controllers: [ProviderController],
  providers: [ProviderService, ProviderRepository],
  exports: [ProviderRepository],
})
export class ProviderModule {}
