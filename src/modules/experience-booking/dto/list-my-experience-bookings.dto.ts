import { IsIn, IsOptional } from 'class-validator';

export class ListMyExperienceBookingsDto {
  @IsOptional()
  @IsIn(['upcoming', 'completed', 'cancelled'])
  status?: 'upcoming' | 'completed' | 'cancelled';
}
