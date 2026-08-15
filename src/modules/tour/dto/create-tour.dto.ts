import {
  IsArray,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTourDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsNumberString()
  destinationId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  durationLabel?: string;

  @IsNumberString()
  price: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxParticipants?: number;

  @IsOptional()
  @IsString()
  included?: string;

  @IsOptional()
  @IsString()
  excluded?: string;

  @IsOptional()
  @IsString()
  cancellationPolicy?: string;
}
