import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsNumberString,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PassengerInputDto } from './passenger-input.dto';

export class CreateFlightBookingDto {
  @IsNumberString()
  scheduleId: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsNumberString({}, { each: true })
  seatIds: string[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PassengerInputDto)
  passengers: PassengerInputDto[];

  @IsString()
  @MinLength(1)
  customerName: string;

  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;
}
