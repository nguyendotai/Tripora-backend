import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ApplyProviderDto {
  @IsString()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  contact?: string;
}
