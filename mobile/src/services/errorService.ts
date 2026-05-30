import { showToast } from '../utils/toast';

export type ErrorSeverity = 'silent' | 'toast' | 'alert';

interface ErrorContext {
  screen?: string;
  action?: string;
  severity?: ErrorSeverity;
}

export function handleError(
  error: unknown,
  context: ErrorContext = {},
): string {
  const { severity = 'toast' } = context;
  const message = extractMessage(error);

  if (severity === 'toast') {
    showToast(message, 'error');
  }

  if (__DEV__) {
    const ctx = context.screen ? `[${context.screen}]` : '';
    console.error(`[ErrorService]${ctx} ${context.action || ''}:`, error);
  }

  return message;
}

function extractMessage(error: unknown): string {
  if (!error) return 'Bilinmeyen bir hata oluştu.';

  if (typeof error === 'string') return error;

  if (error instanceof Error) {
    return error.message || 'Bir hata oluştu.';
  }

  if (typeof error === 'object') {
    const e = error as any;
    const msg = e.response?.data?.message
      || e.response?.data?.error
      || e.data?.message
      || e.message
      || e.error;
    if (typeof msg === 'string') return msg;
    if (Array.isArray(msg)) return msg.join(', ');
  }

  return 'Beklenmeyen bir hata oluştu.';
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message === 'Network Error'
      || error.message.includes('Network Error')
      || error.message.includes('timeout');
  }
  const e = error as any;
  return e?.code === 'ERR_NETWORK'
    || e?.code === 'ECONNABORTED'
    || e?.message === 'Network Error';
}

export function isAuthError(error: unknown): boolean {
  const e = error as any;
  return e?.response?.status === 401 || e?.status === 401;
}
