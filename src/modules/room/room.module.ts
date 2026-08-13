import { Module } from '@nestjs/common';
import { PropertyModule } from '../property/property.module';
import { ProviderModule } from '../provider/provider.module';
import { RoomController } from './room.controller';
import { RoomRepository } from './room.repository';
import { RoomService } from './room.service';

@Module({
  imports: [PropertyModule, ProviderModule],
  controllers: [RoomController],
  providers: [RoomService, RoomRepository],
  exports: [RoomRepository],
})
export class RoomModule {}
