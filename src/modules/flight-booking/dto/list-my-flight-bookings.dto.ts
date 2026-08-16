import { IsIn, IsOptional } from 'class-validator';

export class ListMyFlightBookingsDto {
  @IsOptional()
  @IsIn(['upcoming', 'completed', 'cancelled'])
  status?: 'upcoming' | 'completed' | 'cancelled';
}
