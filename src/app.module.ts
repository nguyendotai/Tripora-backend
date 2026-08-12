import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { DestinationModule } from './modules/destination/destination.module';
import { TravelGuideModule } from './modules/travel-guide/travel-guide.module';
import { TripModule } from './modules/trip/trip.module';
import { UserModule } from './modules/user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    UserModule,
    DestinationModule,
    TravelGuideModule,
    TripModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
