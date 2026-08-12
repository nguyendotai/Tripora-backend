import { IsNumberString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTripItemDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsNumberString()
  destinationId?: string;
}
