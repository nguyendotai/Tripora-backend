import { OmitType } from '@nestjs/swagger';
import { CreatePromotionDto } from './create-promotion.dto';

/** Provider tu tao Promotion cho san pham minh — khong nhan applicableDomains tu client, Service
 * tu gan dung 1 domain theo ProviderType dang dang nhap (1 Provider chi thuoc 1 domain). */
export class CreateMyPromotionDto extends OmitType(CreatePromotionDto, [
  'applicableDomains',
] as const) {}
