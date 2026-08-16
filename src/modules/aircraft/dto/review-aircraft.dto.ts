import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewAircraftDto {
  @IsIn(['APPROVED', 'REJECTED'])
  status: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
