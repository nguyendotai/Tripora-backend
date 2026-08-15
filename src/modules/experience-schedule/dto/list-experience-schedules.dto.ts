import { IsDateString, IsNumberString } from 'class-validator';

export class ListExperienceSchedulesDto {
  @IsNumberString()
  experienceId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
