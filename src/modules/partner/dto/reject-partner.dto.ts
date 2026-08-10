import { IsString, MaxLength, MinLength } from 'class-validator';

export class RejectPartnerDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason: string;
}
