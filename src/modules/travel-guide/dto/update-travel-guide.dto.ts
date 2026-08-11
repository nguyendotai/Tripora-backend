import { PartialType } from '@nestjs/swagger';
import { CreateTravelGuideDto } from './create-travel-guide.dto';

export class UpdateTravelGuideDto extends PartialType(CreateTravelGuideDto) {}
