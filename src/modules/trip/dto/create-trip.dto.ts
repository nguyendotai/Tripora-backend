import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTripDto {
  @IsString()
  @MaxLength(150)
  title: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
