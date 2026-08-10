import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RoomAvailabilityController } from './room-availability.controller';
import { RoomAvailabilityItemController } from './room-availability-item.controller';
import { RoomAvailabilityService } from './room-availability.service';

@Module({
  imports: [AuthModule],
  controllers: [RoomAvailabilityController, RoomAvailabilityItemController],
  providers: [RoomAvailabilityService],
  exports: [RoomAvailabilityService],
})
export class RoomAvailabilityModule {}
