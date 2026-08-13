import { IsIn } from 'class-validator';

export class ReviewProviderDto {
  @IsIn(['APPROVED', 'REJECTED'])
  status: 'APPROVED' | 'REJECTED';
}
