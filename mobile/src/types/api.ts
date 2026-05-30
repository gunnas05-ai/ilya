/** Standard API response wrappers */

export interface ApiResponse<T = unknown> {
  data: T;
  success?: boolean;
  timestamp?: string;
}

export interface PaginatedResponse<T = unknown> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}

export interface ApiError {
  message: string;
  error?: string;
  statusCode: number;
}

export type ApiResult<T> = ApiResponse<T> | T;

export function unwrapResponse<T>(res: any): T {
  return res?.data?.data ?? res?.data ?? res;
}

export function unwrapList<T>(res: any): T[] {
  const data = unwrapResponse<any>(res);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}
