import { Injectable } from '@nestjs/common';
import { ReportRepository } from './report.repository';

const TOP_DESTINATIONS_LIMIT = 5;

@Injectable()
export class ReportService {
  constructor(private readonly reportRepository: ReportRepository) {}

  async overview() {
    const [
      users,
      destinations,
      travelGuides,
      blogPosts,
      trips,
      reviews,
      wishlistItems,
      topDestinationsByWishlist,
    ] = await Promise.all([
      this.reportRepository.countUsers(),
      this.reportRepository.countDestinations(),
      this.reportRepository.countTravelGuides(),
      this.reportRepository.countBlogPosts(),
      this.reportRepository.countTrips(),
      this.reportRepository.reviewStats(),
      this.reportRepository.countWishlistItems(),
      this.reportRepository.topDestinationsByWishlist(TOP_DESTINATIONS_LIMIT),
    ]);

    return {
      users,
      destinations,
      travelGuides,
      blogPosts,
      trips,
      reviews,
      wishlistItems,
      topDestinationsByWishlist,
    };
  }
}
