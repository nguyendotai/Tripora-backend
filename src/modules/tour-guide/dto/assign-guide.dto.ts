import { IsNumberString, IsOptional } from 'class-validator';

export class AssignGuideDto {
  @IsNumberString()
  scheduleId: string;

  /** Bo trong / khong gui = go phan cong Guide khoi ngay khoi hanh nay. */
  @IsOptional()
  @IsNumberString()
  guideId?: string;
}
