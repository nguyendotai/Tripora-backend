import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { TourStatus } from '@prisma/client';

export class ListToursDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsNumberString()
  destinationId?: string;

  @IsOptional()
  @IsEnum(TourStatus)
  status?: TourStatus;

  @IsOptional()
  @IsIn(['newest', 'title_asc'])
  sort?: 'newest' | 'title_asc';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
