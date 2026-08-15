import { IsDateString, IsNumberString } from 'class-validator';

export class CheckAvailabilityDto {
  @IsNumberString()
  roomId: string;

  @IsDateString()
  checkInDate: string;

  @IsDateString()
  checkOutDate: string;
}
