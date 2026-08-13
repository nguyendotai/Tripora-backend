import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewProviderDto {
  @IsIn(['APPROVED', 'REJECTED'])
  status: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
