import { IsString, MinLength } from 'class-validator';

export class PassengerInputDto {
  @IsString()
  @MinLength(1)
  fullName: string;

  @IsString()
  @MinLength(1)
  idNumber: string;
}
