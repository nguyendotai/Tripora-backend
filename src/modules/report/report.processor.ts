import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Job } from 'bullmq';
import { ReportRepository } from './report.repository';
import { GenerateReportJobData, ReportService } from './report.service';

/** V9 vong 7 — khac booking-expiration/notification (khong try/catch, de BullMQ tu retry), o day
 * co try/catch vi Admin can THAY duoc ket qua (PENDING/COMPLETED/FAILED), khong phai tac vu nen
 * am tham. */
@Processor('report')
export class ReportProcessor extends WorkerHost {
  private readonly logger = new Logger(ReportProcessor.name);

  constructor(
    private readonly reportService: ReportService,
    private readonly reportRepository: ReportRepository,
  ) {
    super();
  }

  async process(job: Job<GenerateReportJobData>) {
    const reportId = BigInt(job.data.reportId);
    try {
      const data = await this.reportService.analytics();
      // Prisma.Decimal (revenue.total) can duoc chuan hoa ve JSON thuan truoc khi ghi vao cot Json.
      const safeData = JSON.parse(
        JSON.stringify(data),
      ) as Prisma.InputJsonValue;
      await this.reportRepository.markCompleted(reportId, safeData);
    } catch (error) {
      this.logger.error(
        `Failed to generate report #${reportId}`,
        error instanceof Error ? error.stack : error,
      );
      await this.reportRepository.markFailed(
        reportId,
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }
}
