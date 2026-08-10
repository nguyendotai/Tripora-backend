import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DestinationController } from './destination.controller';
import { DestinationService } from './destination.service';

@Module({
  imports: [AuthModule],
  controllers: [DestinationController],
  providers: [DestinationService],
})
export class DestinationModule {}
