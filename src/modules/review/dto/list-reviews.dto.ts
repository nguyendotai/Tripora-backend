import { Type } from 'class-transformer';
import { IsInt, IsNumberString, IsOptional, Min } from 'class-validator';

export class ListReviewsDto {
  @IsOptional()
  @IsNumberString()
  destinationId?: string;

  @IsOptional()
  @IsNumberString()
  propertyId?: string;

  @IsOptional()
  @IsNumberString()
  tourId?: string;

  @IsOptional()
  @IsNumberString()
  experienceId?: string;

  @IsOptional()
  @IsNumberString()
  flightId?: string;

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
