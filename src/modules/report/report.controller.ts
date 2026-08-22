import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { parseIdParam } from '../../shared/utils/parse-id';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ListReportsDto } from './dto/list-reports.dto';
import { ReportService } from './report.service';

@ApiTags('Report')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('overview')
  overview() {
    return this.reportService.overview();
  }

  @Get('analytics')
  analytics() {
    return this.reportService.analytics();
  }

  @Post('generate')
  @HttpCode(HttpStatus.ACCEPTED)
  generate(@CurrentUser() user: CurrentUserPayload) {
    return this.reportService.generate(BigInt(user.id));
  }

  @Get('generated')
  listGenerated(@Query() query: ListReportsDto) {
    return this.reportService.list(query);
  }

  @Get('generated/:id')
  getGenerated(@Param('id') id: string) {
    return this.reportService.getById(parseIdParam(id));
  }
}
