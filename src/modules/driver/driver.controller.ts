import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../common/decorators/current-user.decorator';
import { parseIdParam } from '../../shared/utils/parse-id';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AssignDriverDto } from './dto/assign-driver.dto';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { DriverService } from './driver.service';

@ApiTags('Driver')
@Controller('drivers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class DriverController {
  constructor(private readonly driverService: DriverService) {}

  @Post()
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateDriverDto,
  ) {
    return this.driverService.create(BigInt(user.id), dto);
  }

  @Get('mine')
  listMine(@CurrentUser() user: CurrentUserPayload) {
    return this.driverService.listMine(BigInt(user.id));
  }

  @Patch('assign')
  assign(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: AssignDriverDto,
  ) {
    return this.driverService.assign(BigInt(user.id), dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateDriverDto,
  ) {
    return this.driverService.update(BigInt(user.id), parseIdParam(id), dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.driverService.remove(BigInt(user.id), parseIdParam(id));
  }
}
