import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateAirportDto {
  @IsString()
  @Matches(/^[A-Z]{3}$/, { message: 'code must be exactly 3 uppercase letters (IATA code)' })
  code: string;

  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  city: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  country: string;
}
