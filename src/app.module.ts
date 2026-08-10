import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { ActivityModule } from './modules/activity/activity.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { DestinationModule } from './modules/destination/destination.module';
import { PropertyModule } from './modules/property/property.module';
import { RoomModule } from './modules/room/room.module';
import { RoomAvailabilityModule } from './modules/room-availability/room-availability.module';
import { BookingModule } from './modules/booking/booking.module';
import { PaymentModule } from './modules/payment/payment.module';
import { RefundModule } from './modules/refund/refund.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    ActivityModule,
    AuthModule,
    UserModule,
    DestinationModule,
    PropertyModule,
    RoomModule,
    RoomAvailabilityModule,
    BookingModule,
    PaymentModule,
    RefundModule,
  ],
})
export class AppModule {}
