import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { UserModule } from '../user/user.module';
import { OrganizationMemberRepository } from './organization-member.repository';
import { OrganizationMemberService } from './organization-member.service';
import { ProviderController } from './provider.controller';
import { ProviderRepository } from './provider.repository';
import { ProviderService } from './provider.service';

@Module({
  imports: [NotificationModule, UserModule],
  controllers: [ProviderController],
  providers: [
    ProviderService,
    ProviderRepository,
    OrganizationMemberService,
    OrganizationMemberRepository,
  ],
  exports: [
    ProviderRepository,
    OrganizationMemberRepository,
    OrganizationMemberService,
  ],
})
export class ProviderModule {}
