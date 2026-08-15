import { Module } from '@nestjs/common';
import { PropertyModule } from '../property/property.module';
import { ProviderModule } from '../provider/provider.module';
import { RoomInventoryModule } from '../room-inventory/room-inventory.module';
import { RoomModule } from '../room/room.module';
import { BookingController } from './booking.controller';
import { BookingRepository } from './booking.repository';
import { BookingService } from './booking.service';

@Module({
  imports: [RoomModule, PropertyModule, RoomInventoryModule, ProviderModule],
  controllers: [BookingController],
  providers: [BookingService, BookingRepository],
})
export class BookingModule {}
