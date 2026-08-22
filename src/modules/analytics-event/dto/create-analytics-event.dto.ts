import { AnalyticsEventType } from '@prisma/client';
import { IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';

export class CreateAnalyticsEventDto {
  @IsEnum(AnalyticsEventType)
  type: AnalyticsEventType;

  @IsOptional()
  @IsNumberString()
  userId?: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsNumberString()
  entityId?: string;

  @IsOptional()
  @IsString()
  query?: string;
}
