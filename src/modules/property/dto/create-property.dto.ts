import {
  IsArray,
  IsLatitude,
  IsLongitude,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreatePropertyDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsNumberString()
  destinationId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(20)
  checkInTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  checkOutTime?: string;

  @IsOptional()
  @IsString()
  policies?: string;
}
