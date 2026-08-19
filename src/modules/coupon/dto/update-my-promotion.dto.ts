import { PartialType } from '@nestjs/swagger';
import { CreateMyPromotionDto } from './create-my-promotion.dto';

export class UpdateMyPromotionDto extends PartialType(CreateMyPromotionDto) {}
