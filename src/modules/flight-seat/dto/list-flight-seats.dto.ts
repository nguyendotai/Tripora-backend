import { IsNumberString } from 'class-validator';

export class ListFlightSeatsDto {
  @IsNumberString()
  scheduleId: string;
}
