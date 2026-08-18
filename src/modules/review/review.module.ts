import { Module } from '@nestjs/common';
import { BookingModule } from '../booking/booking.module';
import { DestinationModule } from '../destination/destination.module';
import { NotificationModule } from '../notification/notification.module';
import { PropertyModule } from '../property/property.module';
import { ProviderModule } from '../provider/provider.module';
import { ReviewController } from './review.controller';
import { ReviewRepository } from './review.repository';
import { ReviewService } from './review.service';

// V7 vong 9 — them PropertyModule (PropertyRepository) + BookingModule (BookingRepository, dung de
// kiem tra "da mua" truoc khi cho Review Property) — an toan, BookingModule khong import nguoc lai
// ReviewModule nen khong tao circular dependency.
// V7 vong 10 — them ProviderModule (OrganizationMemberService) de Provider tu xem Review san pham
// minh (GET /reviews/mine).
@Module({
  imports: [
    DestinationModule,
    NotificationModule,
    PropertyModule,
    BookingModule,
    ProviderModule,
  ],
  controllers: [ReviewController],
  providers: [ReviewRepository, ReviewService],
})
export class ReviewModule {}
