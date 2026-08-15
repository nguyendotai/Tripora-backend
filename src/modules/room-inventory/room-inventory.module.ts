import { Module } from '@nestjs/common';
import { PropertyModule } from '../property/property.module';
import { ProviderModule } from '../provider/provider.module';
import { RoomModule } from '../room/room.module';
import { RoomInventoryController } from './room-inventory.controller';
import { RoomInventoryRepository } from './room-inventory.repository';
import { RoomInventoryService } from './room-inventory.service';

@Module({
  imports: [RoomModule, PropertyModule, ProviderModule],
  controllers: [RoomInventoryController],
  providers: [RoomInventoryService, RoomInventoryRepository],
  exports: [RoomInventoryRepository],
})
export class RoomInventoryModule {}
