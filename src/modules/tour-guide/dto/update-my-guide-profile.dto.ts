import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMyGuideProfileDto {
  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}
