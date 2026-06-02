/* ═══════════════════════════════════════════════════════════════
   KAPTAN WEB — Standard API Helpers (mobile ile aynı pattern)
   Tüm sayfalarda tutarlı hata yönetimi ve API yanıt işleme
   ═══════════════════════════════════════════════════════════════ */

import { api, ApiError } from './api';

/* ── Standart extractor — API yanıtından data çıkarma ──────── */

/** ApiResponse<T> veya direkt T — her ikisini de destekler */
export function extractData<T>(response: any): T {
  if (response?.data?.data !== undefined) return response.data.data as T;
  if (response?.data !== undefined) return response.data as T;
  return response as T;
}

/** Liste yanıtı — her zaman dizi döner */
export function extractList<T>(response: any): T[] {
  const data = extractData<any>(response);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

/** Sayfalı yanıt */
export function extractPaginated<T>(response: any): { items: T[]; total: number; page: number; limit: number } {
  const d = response?.data?.data || response?.data || {};
  return {
    items: Array.isArray(d.data) ? d.data : Array.isArray(d.items) ? d.items : Array.isArray(d) ? d : [],
    total: d.total || d.count || 0,
    page: d.page || 1,
    limit: d.limit || 20,
  };
}

/* ── Standart hata işleme ──────────────────────────────────── */

export function getErrorMessage(err: unknown, fallback = 'Bir hata oluştu'): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  const anyErr = err as any;
  return anyErr?.response?.data?.message
    || anyErr?.response?.data?.error
    || anyErr?.message
    || fallback;
}

export function isNetworkError(err: unknown): boolean {
  const anyErr = err as any;
  return !anyErr?.response && (anyErr?.code === 'ERR_NETWORK' || anyErr?.code === 'ECONNABORTED' || anyErr?.message?.includes('Network'));
}

export function isAuthError(err: unknown): boolean {
  const anyErr = err as any;
  return anyErr?.response?.status === 401 || anyErr?.statusCode === 401;
}

/* ── Standart API wrapper — try/catch tekrarını azaltır ────── */

interface ApiCallResult<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

/** React state güncelleyen wrapper */
export async function safeApiCall<T>(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  body?: any,
): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await api.request({ method, url, data: body });
    return { data: extractData<T>(res), error: null };
  } catch (err) {
    return { data: null, error: getErrorMessage(err) };
  }
}

/* ── Bildirim yardımcıları ─────────────────────────────────── */

export { api, ApiError };
