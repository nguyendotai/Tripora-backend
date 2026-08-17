import {
  IsInt,
  IsNumberString,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateFlightDto {
  @IsNumberString()
  aircraftId: string;

  @IsString()
  @MinLength(1)
  flightNumber: string;

  @IsNumberString()
  departureAirportId: string;

  @IsNumberString()
  arrivalAirportId: string;

  @IsInt()
  @Min(1)
  duration: number;
}
