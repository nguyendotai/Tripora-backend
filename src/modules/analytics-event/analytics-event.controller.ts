import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AnalyticsEventService } from './analytics-event.service';
import { CreateAnalyticsEventDto } from './dto/create-analytics-event.dto';

/** Khong co Guard — khach chua dang nhap cung search/view duoc, can ghi nhan an danh
 * (userId khong co trong body). Xem ghi chu best-effort o Service. */
@ApiTags('AnalyticsEvent')
@Controller('analytics-events')
export class AnalyticsEventController {
  constructor(private readonly analyticsEventService: AnalyticsEventService) {}

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  track(@Body() dto: CreateAnalyticsEventDto) {
    return this.analyticsEventService.track(dto);
  }
}
