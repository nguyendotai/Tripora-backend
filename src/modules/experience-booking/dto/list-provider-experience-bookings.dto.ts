import { IsIn, IsNumberString, IsOptional } from 'class-validator';

export class ListProviderExperienceBookingsDto {
  @IsOptional()
  @IsIn(['upcoming', 'completed', 'cancelled'])
  status?: 'upcoming' | 'completed' | 'cancelled';

  @IsOptional()
  @IsNumberString()
  experienceId?: string;
}
