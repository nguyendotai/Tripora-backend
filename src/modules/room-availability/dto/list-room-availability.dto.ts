import { IsDateString, IsOptional } from 'class-validator';

export class ListRoomAvailabilityDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
