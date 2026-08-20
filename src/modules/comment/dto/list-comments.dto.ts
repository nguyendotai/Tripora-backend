import { Type } from 'class-transformer';
import { IsInt, IsNumberString, Min, IsOptional } from 'class-validator';

export class ListCommentsDto {
  @IsNumberString()
  postId: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
