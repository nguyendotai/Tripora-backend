import { IsDateString, IsInt, IsNumber, Min } from 'class-validator';

export class UpsertRoomAvailabilityDto {
  @IsDateString()
  date: string;

  @IsInt()
  @Min(0)
  total: number;

  @IsNumber()
  @Min(0)
  price: number;
}
