import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PropertyRoomController } from './room.controller';
import { RoomItemController } from './room-item.controller';
import { RoomService } from './room.service';

@Module({
  imports: [AuthModule],
  controllers: [PropertyRoomController, RoomItemController],
  providers: [RoomService],
})
export class RoomModule {}
