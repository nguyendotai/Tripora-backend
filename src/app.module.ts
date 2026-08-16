import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { BlogModule } from './modules/blog/blog.module';
import { BookingModule } from './modules/booking/booking.module';
import { DestinationModule } from './modules/destination/destination.module';
import { NotificationModule } from './modules/notification/notification.module';
import { ProviderModule } from './modules/provider/provider.module';
import { PropertyModule } from './modules/property/property.module';
import { ReportModule } from './modules/report/report.module';
import { RoomModule } from './modules/room/room.module';
import { RoomInventoryModule } from './modules/room-inventory/room-inventory.module';
import { TourModule } from './modules/tour/tour.module';
import { TourItineraryModule } from './modules/tour-itinerary/tour-itinerary.module';
import { TourScheduleModule } from './modules/tour-schedule/tour-schedule.module';
import { TourBookingModule } from './modules/tour-booking/tour-booking.module';
import { TourGuideModule } from './modules/tour-guide/tour-guide.module';
import { ExperienceModule } from './modules/experience/experience.module';
import { ExperienceScheduleModule } from './modules/experience-schedule/experience-schedule.module';
import { ExperienceBookingModule } from './modules/experience-booking/experience-booking.module';
import { VehicleModule } from './modules/vehicle/vehicle.module';
import { TransportRouteModule } from './modules/transport-route/transport-route.module';
import { TransportScheduleModule } from './modules/transport-schedule/transport-schedule.module';
import { TransportBookingModule } from './modules/transport-booking/transport-booking.module';
import { DriverModule } from './modules/driver/driver.module';
import { AirportModule } from './modules/airport/airport.module';
import { AircraftModule } from './modules/aircraft/aircraft.module';
import { FlightModule } from './modules/flight/flight.module';
import { FlightScheduleModule } from './modules/flight-schedule/flight-schedule.module';
import { FlightSeatModule } from './modules/flight-seat/flight-seat.module';
import { FlightBookingModule } from './modules/flight-booking/flight-booking.module';
import { TravelGuideModule } from './modules/travel-guide/travel-guide.module';
import { TripModule } from './modules/trip/trip.module';
import { UploadModule } from './modules/upload/upload.module';
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
    RoomInventoryModule,
    BookingModule,
    UploadModule,
    TourModule,
    TourItineraryModule,
    TourScheduleModule,
    TourBookingModule,
    TourGuideModule,
    ExperienceModule,
    ExperienceScheduleModule,
    ExperienceBookingModule,
    VehicleModule,
    TransportRouteModule,
    TransportScheduleModule,
    TransportBookingModule,
    DriverModule,
    AirportModule,
    AircraftModule,
    FlightModule,
    FlightScheduleModule,
    FlightSeatModule,
    FlightBookingModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
