import { IsDateString, IsOptional } from 'class-validator';

export class CreateTripDayDto {
  @IsOptional()
  @IsDateString()
  date?: string;
}
