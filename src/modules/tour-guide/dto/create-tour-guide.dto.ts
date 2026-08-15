import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTourGuideDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}
