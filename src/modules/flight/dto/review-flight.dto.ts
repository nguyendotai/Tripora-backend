import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewFlightDto {
  @IsIn(['APPROVED', 'REJECTED'])
  status: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
