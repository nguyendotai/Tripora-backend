import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { ProviderModule } from '../provider/provider.module';
import { ConversationController } from './conversation.controller';
import { ConversationRepository } from './conversation.repository';
import { ConversationService } from './conversation.service';

/** V9 vong 3 — import ProviderModule (OrganizationMemberService/Repository, ProviderRepository)
 * va NotificationModule (tai su dung notify() thay vi tao Socket.IO room/event rieng cho Chat) —
 * ca 2 deu la import 1 chieu an toan, khong module nao trong 2 cai nay import nguoc lai
 * ConversationModule nen khong co circular dependency. */
@Module({
  imports: [ProviderModule, NotificationModule],
  controllers: [ConversationController],
  providers: [ConversationService, ConversationRepository],
})
export class ConversationModule {}
