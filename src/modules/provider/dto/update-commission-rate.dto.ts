import { IsNumber, Max, Min } from 'class-validator';

export class UpdateCommissionRateDto {
  @IsNumber()
  @Min(0)
  @Max(1)
  commissionRate: number;
}
