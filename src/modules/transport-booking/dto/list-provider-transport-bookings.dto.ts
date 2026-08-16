import { IsIn, IsNumberString, IsOptional } from 'class-validator';

export class ListProviderTransportBookingsDto {
  @IsOptional()
  @IsIn(['upcoming', 'completed', 'cancelled'])
  status?: 'upcoming' | 'completed' | 'cancelled';

  @IsOptional()
  @IsNumberString()
  routeId?: string;
}
