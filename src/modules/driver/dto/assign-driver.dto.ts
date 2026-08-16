import { IsNumberString, IsOptional } from 'class-validator';

export class AssignDriverDto {
  @IsNumberString()
  bookingId: string;

  /** Bo trong / khong gui = go phan cong Driver khoi Booking nay. */
  @IsOptional()
  @IsNumberString()
  driverId?: string;
}
