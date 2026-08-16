import { IsDateString, IsNumberString } from 'class-validator';

export class CheckTransportAvailabilityDto {
  @IsNumberString()
  routeId: string;

  @IsNumberString()
  vehicleId: string;

  @IsDateString()
  departureDate: string;
}
