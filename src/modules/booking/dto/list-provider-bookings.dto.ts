import { IsIn, IsNumberString, IsOptional } from 'class-validator';

export class ListProviderBookingsDto {
  @IsOptional()
  @IsIn(['upcoming', 'completed', 'cancelled'])
  status?: 'upcoming' | 'completed' | 'cancelled';

  @IsOptional()
  @IsNumberString()
  propertyId?: string;
}
