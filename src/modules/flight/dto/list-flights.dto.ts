import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumberString, IsOptional, Min } from 'class-validator';
import { FlightStatus } from '@prisma/client';

export class ListFlightsDto {
  @IsOptional()
  @IsNumberString()
  departureAirportId?: string;

  @IsOptional()
  @IsNumberString()
  arrivalAirportId?: string;

  @IsOptional()
  @IsEnum(FlightStatus)
  status?: FlightStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
