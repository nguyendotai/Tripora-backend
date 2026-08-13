import { IsDateString, IsNumberString } from 'class-validator';

export class ListRoomInventoryDto {
  @IsNumberString()
  roomId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
