import { BadRequestException } from '@nestjs/common';

const NUMERIC_ID_PATTERN = /^\d+$/;

/** Parse route param dạng id (BIGINT UNSIGNED) — 400 nếu không phải số nguyên dương hợp lệ. */
export function parseIdParam(value: string): bigint {
  if (!NUMERIC_ID_PATTERN.test(value)) {
    throw new BadRequestException('Invalid id');
  }
  return BigInt(value);
}
