import { Module } from '@nestjs/common';
import { DestinationController } from './destination.controller';
import { DestinationRepository } from './destination.repository';
import { DestinationService } from './destination.service';

@Module({
  controllers: [DestinationController],
  providers: [DestinationService, DestinationRepository],
})
export class DestinationModule {}
