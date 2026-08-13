import {
  IsArray,
  IsInt,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateRoomDto {
  @IsNumberString()
  propertyId: string;

  @IsString()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  beds?: string[];

  @IsNumber()
  @Min(0)
  basePrice: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}
