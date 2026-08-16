import { PartialType } from '@nestjs/swagger';
import { CreateTransportRouteDto } from './create-transport-route.dto';

export class UpdateTransportRouteDto extends PartialType(
  CreateTransportRouteDto,
) {}
