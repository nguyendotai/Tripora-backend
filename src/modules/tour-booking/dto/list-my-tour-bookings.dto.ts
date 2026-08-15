import { IsIn, IsOptional } from 'class-validator';

export class ListMyTourBookingsDto {
  @IsOptional()
  @IsIn(['upcoming', 'completed', 'cancelled'])
  status?: 'upcoming' | 'completed' | 'cancelled';
}
