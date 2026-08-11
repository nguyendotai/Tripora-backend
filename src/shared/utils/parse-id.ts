import { BadRequestException } from '@nestjs/common';

export function parseIdParam(value: string): bigint {
  if (!/^\d+$/.test(value)) {
    throw new BadRequestException('Invalid id parameter');
  }
  return BigInt(value);
}
