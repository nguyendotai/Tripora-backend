import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ProviderType } from '@prisma/client';

export class ApplyProviderDto {
  @IsString()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsEnum(ProviderType)
  type?: ProviderType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  contact?: string;

  /** URL tai lieu kinh doanh (giay phep, chung chi...) da upload qua POST /uploads/image. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documents?: string[];
}
