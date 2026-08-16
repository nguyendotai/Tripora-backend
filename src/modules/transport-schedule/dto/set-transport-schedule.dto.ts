import {
  IsDateString,
  IsInt,
  IsNumber,
  IsNumberString,
  IsOptional,
  Min,
} from 'class-validator';

export class SetTransportScheduleDto {
  @IsNumberString()
  routeId: string;

  @IsNumberString()
  vehicleId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsInt()
  @Min(0)
  capacity: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;
}
