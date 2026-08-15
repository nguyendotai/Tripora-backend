import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateTourItineraryDto } from './create-tour-itinerary.dto';

export class UpdateTourItineraryDto extends PartialType(
  OmitType(CreateTourItineraryDto, ['tourId'] as const),
) {}
