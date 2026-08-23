import {
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

// V7 vong 9 — destinationId/propertyId optional, dung dung 1 trong so cac field target (XOR, validate
// o Service). V7 vong 12 — them tourId/experienceId/flightId, cung nguyen tac.
export class CreateReviewDto {
  @IsOptional()
  @IsNumberString()
  destinationId?: string;

  @IsOptional()
  @IsNumberString()
  propertyId?: string;

  @IsOptional()
  @IsNumberString()
  tourId?: string;

  @IsOptional()
  @IsNumberString()
  experienceId?: string;

  @IsOptional()
  @IsNumberString()
  flightId?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  content?: string;
}
