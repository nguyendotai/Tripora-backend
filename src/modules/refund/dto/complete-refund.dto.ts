import { IsEnum } from 'class-validator';

export enum RefundCompletionStatus {
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export class CompleteRefundDto {
  @IsEnum(RefundCompletionStatus)
  status: RefundCompletionStatus;
}
