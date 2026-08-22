import { Injectable } from '@nestjs/common';
import { groupPlatformCommissionsByDay } from '../../shared/utils/group-commissions-by-day';
import { ReportRepository } from './report.repository';

const TOP_DESTINATIONS_LIMIT = 5;
const ANALYTICS_DAYS = 30;

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

  /** V9 vong 4 — Analytics Dashboard (Platform), so lieu marketplace/tai chinh (khac overview()
   * la so lieu noi dung/tuong tac). Revenue tong all-time, chart 30 ngay gan nhat — mirror dung
   * split "getSummary() all-time / getAnalytics() 30 ngay" da co o CommissionService. */
  async analytics() {
    const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
    const since = new Date(today);
    since.setUTCDate(since.getUTCDate() - (ANALYTICS_DAYS - 1));

    const [revenueSummary, commissionsSince, bookings, providers, users, conversion] =
      await Promise.all([
        this.reportRepository.getPlatformCommissionSummary(),
        this.reportRepository.findAllCommissionsSince(since),
        this.reportRepository.countBookingsByDomain(),
        this.reportRepository.countProvidersByStatus(),
        this.reportRepository.countUsers(),
        this.reportRepository.getConversion30d(since),
      ]);

    return {
      revenue: {
        total: revenueSummary.totalRevenue,
        totalTransactions: revenueSummary.totalTransactions,
        last30d: groupPlatformCommissionsByDay(commissionsSince, ANALYTICS_DAYS),
      },
      bookings,
      providers,
      users,
      conversion,
    };
  }
}
