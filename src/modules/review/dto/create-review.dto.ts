import { IsInt, IsNumberString, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateReviewDto {
  @IsNumberString()
  destinationId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  content?: string;
}
