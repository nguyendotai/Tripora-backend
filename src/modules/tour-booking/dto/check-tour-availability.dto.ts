import { IsDateString, IsNumberString } from 'class-validator';

export class CheckTourAvailabilityDto {
  @IsNumberString()
  tourId: string;

  @IsDateString()
  departureDate: string;
}
