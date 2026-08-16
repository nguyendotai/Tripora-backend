import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { AircraftStatus } from '@prisma/client';

export class ListAircraftDto {
  @IsOptional()
  @IsEnum(AircraftStatus)
  status?: AircraftStatus;

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
