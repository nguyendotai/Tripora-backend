export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface Paginated<T> {
  items: T[];
  pagination: PaginationMeta;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export function resolvePagination(query: PaginationQuery) {
  const page = Math.max(query.page ?? DEFAULT_PAGE, 1);
  const limit = Math.min(Math.max(query.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

/** Cho cac endpoint "top N" khong phan trang (popular/highlights/active) — khac resolvePagination
 * vi khong co khai niem page/skip, chi can 1 gioi han an toan. */
export function clampLimit(
  rawLimit: number | undefined,
  defaultLimit: number,
  maxLimit: number,
): number {
  return Math.min(Math.max(rawLimit ?? defaultLimit, 1), maxLimit);
}

export function buildPaginated<T>(
  items: T[],
  totalItems: number,
  page: number,
  limit: number,
): Paginated<T> {
  const totalPages = Math.max(Math.ceil(totalItems / limit), 1);
  return {
    items,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}
