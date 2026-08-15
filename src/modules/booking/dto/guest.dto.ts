import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class GuestDto {
  @IsString()
  @MinLength(1)
  fullName: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
