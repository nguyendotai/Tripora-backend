import { Module } from '@nestjs/common';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { BookingModule } from '../booking/booking.module';
import { DestinationModule } from '../destination/destination.module';
import { ExperienceModule } from '../experience/experience.module';
import { ExperienceBookingModule } from '../experience-booking/experience-booking.module';
import { FlightModule } from '../flight/flight.module';
import { FlightBookingModule } from '../flight-booking/flight-booking.module';
import { NotificationModule } from '../notification/notification.module';
import { PropertyModule } from '../property/property.module';
import { ProviderModule } from '../provider/provider.module';
import { TourModule } from '../tour/tour.module';
import { TourBookingModule } from '../tour-booking/tour-booking.module';
import { ReviewController } from './review.controller';
import { ReviewRepository } from './review.repository';
import { ReviewService } from './review.service';

// V7 vong 9 — them PropertyModule (PropertyRepository) + BookingModule (BookingRepository, dung de
// kiem tra "da mua" truoc khi cho Review Property) — an toan, BookingModule khong import nguoc lai
// ReviewModule nen khong tao circular dependency.
// V7 vong 10 — them ProviderModule (OrganizationMemberService) de Provider tu xem Review san pham
// minh (GET /reviews/mine).
// V7 vong 12 — mo rong Review sang Tour/Experience/Flight, mirror y het cach lam Property: moi domain
// them 1 Module san pham (Tour/Experience/Flight) + 1 Module booking-check (TourBooking/
// ExperienceBooking/FlightBooking). Da xac nhan khong module nao import nguoc ReviewModule.
@Module({
  imports: [
    DestinationModule,
    NotificationModule,
    PropertyModule,
    BookingModule,
    ProviderModule,
    ActivityLogModule,
    TourModule,
    TourBookingModule,
    ExperienceModule,
    ExperienceBookingModule,
    FlightModule,
    FlightBookingModule,
  ],
  controllers: [ReviewController],
  providers: [ReviewRepository, ReviewService],
})
export class ReviewModule {}
