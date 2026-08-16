import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateAircraftDto {
  @IsString()
  @MinLength(1)
  model: string;

  @IsString()
  @MinLength(1)
  registrationCode: string;

  @IsInt()
  @Min(1)
  economyCapacity: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  businessCapacity?: number;
}
