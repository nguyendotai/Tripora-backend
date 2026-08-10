import {
  IsEmail,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateBookingDto {
  @IsString()
  @Matches(/^\d+$/, { message: 'roomId must be numeric' })
  roomId: string;

  @IsISO8601({ strict: true })
  checkIn: string;

  @IsISO8601({ strict: true })
  checkOut: string;

  @IsInt()
  @Min(1)
  @Max(20)
  quantity: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  guestName?: string;

  @IsOptional()
  @IsEmail()
  guestEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  guestPhone?: string;
}
