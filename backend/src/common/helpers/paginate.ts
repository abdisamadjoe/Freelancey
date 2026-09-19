export function paginationArgs(page: number, limit: number) {
  return { skip: (page - 1) * limit, take: limit };
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
) {
  return {
    data,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}
