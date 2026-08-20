import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { FollowController } from './follow.controller';
import { FollowRepository } from './follow.repository';
import { FollowService } from './follow.service';

@Module({
  imports: [UserModule],
  controllers: [FollowController],
  providers: [FollowService, FollowRepository],
})
export class FollowModule {}
