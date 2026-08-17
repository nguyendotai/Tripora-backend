import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { BookingDomain, DiscountType, PromoStatus } from '@prisma/client';

export class CreateCouponDto {
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{3,30}$/, {
    message: 'code must be 3-30 letters/digits/-/_ (auto-uppercased when saved)',
  })
  code: string;

  @IsEnum(DiscountType)
  discountType: DiscountType;

  @IsNumber()
  @Min(0)
  discountValue: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(Object.values(BookingDomain), { each: true })
  applicableDomains?: BookingDomain[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  usageLimit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  perUserLimit?: number;

  @IsDateString()
  validFrom: string;

  @IsDateString()
  validUntil: string;

  @IsOptional()
  @IsEnum(PromoStatus)
  status?: PromoStatus;
}
