import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RefundController } from './refund.controller';
import { RefundService } from './refund.service';

@Module({
  imports: [AuthModule],
  controllers: [RefundController],
  providers: [RefundService],
})
export class RefundModule {}
