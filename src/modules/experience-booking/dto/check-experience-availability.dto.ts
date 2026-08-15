import { IsDateString, IsNumberString } from 'class-validator';

export class CheckExperienceAvailabilityDto {
  @IsNumberString()
  experienceId: string;

  @IsDateString()
  departureDate: string;
}
