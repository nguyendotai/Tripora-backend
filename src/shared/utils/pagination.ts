export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: PaginationMeta;
}

/** Chuẩn hoá response phân trang theo api-contract.md mục 2. */
export function paginate<T>(
  items: T[],
  page: number,
  limit: number,
  totalItems: number,
): PaginatedResult<T> {
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
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
