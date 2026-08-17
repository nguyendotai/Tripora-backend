import {
  IsDateString,
  IsInt,
  IsNumber,
  IsNumberString,
  IsOptional,
  Min,
} from 'class-validator';

export class SetRoomInventoryDto {
  @IsNumberString()
  roomId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsInt()
  @Min(0)
  totalRooms: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;
}
