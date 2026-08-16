import {
  IsDateString,
  IsEmail,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateTourBookingDto {
  @IsNumberString()
  tourId: string;

  @IsDateString()
  departureDate: string;

  @IsInt()
  @Min(1)
  numberOfPeople: number;

  @IsString()
  @MinLength(1)
  customerName: string;

  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  couponCode?: string;
}
