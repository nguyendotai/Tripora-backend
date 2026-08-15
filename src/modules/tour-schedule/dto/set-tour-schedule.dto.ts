import { IsDateString, IsInt, IsNumber, IsNumberString, IsOptional, Min } from 'class-validator';

export class SetTourScheduleDto {
  @IsNumberString()
  tourId: string;

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
