import { PartialType } from '@nestjs/swagger';
import { CreateTripItemDto } from './create-trip-item.dto';

export class UpdateTripItemDto extends PartialType(CreateTripItemDto) {}
