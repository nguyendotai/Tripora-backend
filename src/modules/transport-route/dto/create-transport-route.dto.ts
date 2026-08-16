import {
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { VehicleType } from '@prisma/client';

export class CreateTransportRouteDto {
  @IsString()
  @MaxLength(200)
  origin: string;

  @IsString()
  @MaxLength(200)
  destination: string;

  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;

  @IsNumberString()
  price: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  estimatedDuration?: string;
}
