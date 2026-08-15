import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SuspendProviderDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
