import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RoomAvailabilityModule } from '../room-availability/room-availability.module';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { BookingSchedulerService } from './booking-scheduler.service';

@Module({
  imports: [AuthModule, RoomAvailabilityModule],
  controllers: [BookingController],
  providers: [BookingService, BookingSchedulerService],
})
export class BookingModule {}
