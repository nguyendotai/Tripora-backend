import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateRoomDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  type?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  capacityAdults?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  capacityChildren?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  bedType?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsNumber()
  @Min(0)
  basePrice: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;
}
