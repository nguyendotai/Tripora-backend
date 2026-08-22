import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Queue } from 'bullmq';
import { groupPlatformCommissionsByDay } from '../../shared/utils/group-commissions-by-day';
import {
  buildPaginated,
  resolvePagination,
} from '../../shared/utils/pagination';
import { ListReportsDto } from './dto/list-reports.dto';
import { ReportRepository } from './report.repository';

const TOP_DESTINATIONS_LIMIT = 5;
const ANALYTICS_DAYS = 30;

export interface GenerateReportJobData {
  reportId: string;
}

@Injectable()
export class ReportService {
  constructor(
    private readonly reportRepository: ReportRepository,
    @InjectQueue('report')
    private readonly reportQueue: Queue<GenerateReportJobData>,
  ) {}

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
    const today = new Date(
      `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`,
    );
    const since = new Date(today);
    since.setUTCDate(since.getUTCDate() - (ANALYTICS_DAYS - 1));

    const [
      revenueSummary,
      commissionsSince,
      bookings,
      providers,
      users,
      conversion,
    ] = await Promise.all([
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
        last30d: groupPlatformCommissionsByDay(
          commissionsSince,
          ANALYTICS_DAYS,
        ),
      },
      bookings,
      providers,
      users,
      conversion,
    };
  }

  /** V9 vong 7 — enqueue job nen, ReportProcessor se goi lai chinh analytics() nay de lay data. */
  async generate(requestedBy: bigint) {
    const report = await this.reportRepository.createReport(requestedBy);
    await this.reportQueue.add('generate', { reportId: report.id.toString() });
    return report;
  }

  async list(query: ListReportsDto) {
    const { page, limit, skip, take } = resolvePagination(query);
    const where: Prisma.ReportWhereInput = {
      ...(query.status && { status: query.status }),
    };
    const [items, totalItems] = await this.reportRepository.findMany(
      where,
      skip,
      take,
    );
    return buildPaginated(items, totalItems, page, limit);
  }

  async getById(id: bigint) {
    const report = await this.reportRepository.findById(id);
    if (!report) {
      throw new NotFoundException('Report not found');
    }
    return report;
  }
}
