import { IsDateString, IsNumberString } from 'class-validator';

export class ListFlightSchedulesDto {
  @IsNumberString()
  flightId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
