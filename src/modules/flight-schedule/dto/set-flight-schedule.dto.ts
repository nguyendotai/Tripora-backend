import {
  IsDateString,
  IsNumber,
  IsNumberString,
  IsOptional,
  Matches,
  Min,
} from 'class-validator';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class SetFlightScheduleDto {
  @IsNumberString()
  flightId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @Matches(TIME_PATTERN, { message: 'departureTime must be in HH:mm format' })
  departureTime: string;

  @Matches(TIME_PATTERN, { message: 'arrivalTime must be in HH:mm format' })
  arrivalTime: string;

  @IsNumber()
  @Min(0)
  economyPrice: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  businessPrice?: number;
}
