import {
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

// V7 vong 9 — destinationId va propertyId deu optional, dung dung 1 trong 2 (XOR, validate o Service).
export class CreateReviewDto {
  @IsOptional()
  @IsNumberString()
  destinationId?: string;

  @IsOptional()
  @IsNumberString()
  propertyId?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  content?: string;
}
