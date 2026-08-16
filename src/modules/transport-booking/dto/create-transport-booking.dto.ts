import { IsDateString, IsEmail, IsInt, IsNumberString, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateTransportBookingDto {
  @IsNumberString()
  routeId: string;

  @IsNumberString()
  vehicleId: string;

  @IsDateString()
  departureDate: string;

  @IsInt()
  @Min(1)
  numberOfPeople: number;

  @IsString()
  @MinLength(1)
  customerName: string;

  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;
}
