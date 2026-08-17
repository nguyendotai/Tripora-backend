import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { parseIdParam } from '../../shared/utils/parse-id';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CouponService } from './coupon.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { ListCouponsDto } from './dto/list-coupons.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';

/** ADMIN-only toan bo — Coupon khong phai du lieu duyet cong khai nhu Airport, khach ap ma bang
 * cach tu nhap dung code (khong can duyet danh sach cong khai). */
@ApiTags('Coupon')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('coupons')
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  @Get()
  list(@Query() query: ListCouponsDto) {
    return this.couponService.listAll(query);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.couponService.getById(parseIdParam(id));
  }

  @Post()
  create(@Body() dto: CreateCouponDto) {
    return this.couponService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.couponService.update(parseIdParam(id), dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.couponService.remove(parseIdParam(id));
  }
}
