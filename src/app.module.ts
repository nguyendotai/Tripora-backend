import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { BlogModule } from './modules/blog/blog.module';
import { DestinationModule } from './modules/destination/destination.module';
import { NotificationModule } from './modules/notification/notification.module';
import { ProviderModule } from './modules/provider/provider.module';
import { PropertyModule } from './modules/property/property.module';
import { ReportModule } from './modules/report/report.module';
import { RoomModule } from './modules/room/room.module';
import { TravelGuideModule } from './modules/travel-guide/travel-guide.module';
import { TripModule } from './modules/trip/trip.module';
import { UserModule } from './modules/user/user.module';
import { WishlistModule } from './modules/wishlist/wishlist.module';
import { ReviewModule } from './modules/review/review.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    UserModule,
    DestinationModule,
    TravelGuideModule,
    TripModule,
    WishlistModule,
    ReviewModule,
    BlogModule,
    NotificationModule,
    ReportModule,
    ProviderModule,
    PropertyModule,
    RoomModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
