import { IsIn, IsNumberString, IsOptional } from 'class-validator';

export class ListProviderTourBookingsDto {
  @IsOptional()
  @IsIn(['upcoming', 'completed', 'cancelled'])
  status?: 'upcoming' | 'completed' | 'cancelled';

  @IsOptional()
  @IsNumberString()
  tourId?: string;
}
