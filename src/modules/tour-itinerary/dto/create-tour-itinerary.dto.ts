import {
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateTourItineraryDto {
  @IsNumberString()
  tourId: string;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  activities?: string;

  @IsOptional()
  @IsString()
  meals?: string;

  @IsOptional()
  @IsString()
  locations?: string;
}
