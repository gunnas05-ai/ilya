/**
 * Unified error handling — ported from mobile services/errorService.ts
 * Faz-1: Merkezi hata yakalama, mobildeki handleError ile aynı pattern
 */
import { ApiError, showToast } from './api';

export type ErrorSeverity = 'silent' | 'toast' | 'alert';

interface ErrorContext {
  screen?: string;
  action?: string;
  severity?: ErrorSeverity;
}

/** Catch-all error handler — extracts message and optionally shows toast */
export function handleError(error: unknown, context: ErrorContext = {}): string {
  const { severity = 'toast' } = context;
  const message = extractMessage(error);

  if (severity === 'toast') showToast(message, 'error');

  if (process.env.NODE_ENV === 'development') {
    const ctx = context.screen ? `[${context.screen}]` : '';
    console.error(`[ErrorService]${ctx} ${context.action || ''}:`, error);
  }

  return message;
}

/** Extract human-readable message from any error shape */
function extractMessage(error: unknown): string {
  if (!error) return 'Bilinmeyen bir hata oluştu.';
  if (typeof error === 'string') return error;
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message || 'Bir hata oluştu.';

  if (typeof error === 'object') {
    const e = error as any;
    const msg = e.response?.data?.message || e.response?.data?.error || e.data?.message || e.message || e.error;
    if (typeof msg === 'string') return msg;
    if (Array.isArray(msg)) return msg.join(', ');
  }

  return 'Beklenmeyen bir hata oluştu.';
}

/** Check if error is a network/timeout issue */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof ApiError) return error.errorCode === 'NETWORK_ERROR';
  if (error instanceof Error) return error.message.includes('Network Error') || error.message.includes('timeout') || error.message.includes('Ağ bağlantı');
  const e = error as any;
  return e?.code === 'ERR_NETWORK' || e?.code === 'ECONNABORTED' || e?.message === 'Network Error';
}

/** Check if error is an auth/403/401 issue */
export function isAuthError(error: unknown): boolean {
  if (error instanceof ApiError) return error.statusCode === 401 || error.statusCode === 403;
  const e = error as any;
  return e?.response?.status === 401 || e?.response?.status === 403 || e?.status === 401;
}
