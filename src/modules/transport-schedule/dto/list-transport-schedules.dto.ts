import { IsDateString, IsNumberString, IsOptional } from 'class-validator';

export class ListTransportSchedulesDto {
  @IsNumberString()
  routeId: string;

  @IsOptional()
  @IsNumberString()
  vehicleId?: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
