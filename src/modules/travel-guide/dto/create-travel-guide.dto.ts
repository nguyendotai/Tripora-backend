import { IsNumberString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTravelGuideDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  excerpt?: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @IsNumberString()
  destinationId?: string;
}
