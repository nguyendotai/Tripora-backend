import { IsDateString, IsNumberString } from 'class-validator';

export class ListTourSchedulesDto {
  @IsNumberString()
  tourId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
