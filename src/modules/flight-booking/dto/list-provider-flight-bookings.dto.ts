import { IsIn, IsNumberString, IsOptional } from 'class-validator';

export class ListProviderFlightBookingsDto {
  @IsOptional()
  @IsIn(['upcoming', 'completed', 'cancelled'])
  status?: 'upcoming' | 'completed' | 'cancelled';

  @IsOptional()
  @IsNumberString()
  flightId?: string;
}
