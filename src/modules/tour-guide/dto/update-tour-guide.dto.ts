import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { TourGuideStatus } from '@prisma/client';

export class UpdateTourGuideDto {
  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsEnum(TourGuideStatus)
  status?: TourGuideStatus;
}
