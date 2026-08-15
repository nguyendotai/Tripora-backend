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
import { ExperienceStatus } from '@prisma/client';

export class ListExperiencesDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsNumberString()
  destinationId?: string;

  @IsOptional()
  @IsEnum(ExperienceStatus)
  status?: ExperienceStatus;

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
