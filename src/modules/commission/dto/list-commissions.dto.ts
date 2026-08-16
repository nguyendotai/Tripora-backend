import { Type } from 'class-transformer';
import { IsInt, IsNumberString, IsOptional, Min } from 'class-validator';

export class ListCommissionsDto {
  @IsOptional()
  @IsNumberString()
  providerId?: string;

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
