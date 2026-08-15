import { Type } from 'class-transformer';
import { ArrayMinSize, IsDateString, IsNumberString, ValidateNested } from 'class-validator';
import { GuestDto } from './guest.dto';

export class CreateBookingDto {
  @IsNumberString()
  roomId: string;

  @IsDateString()
  checkInDate: string;

  @IsDateString()
  checkOutDate: string;

  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => GuestDto)
  guests: GuestDto[];
}
