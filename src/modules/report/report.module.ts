import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ReportController } from './report.controller';
import { ReportProcessor } from './report.processor';
import { ReportRepository } from './report.repository';
import { ReportService } from './report.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'report' })],
  controllers: [ReportController],
  providers: [ReportService, ReportRepository, ReportProcessor],
})
export class ReportModule {}
