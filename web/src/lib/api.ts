import axios from 'axios';

const API_BASE = '/api/v1';

export class ApiError extends Error {
  statusCode: number; errorCode?: string;
  constructor(message: string, statusCode: number, errorCode?: string) { super(message); this.name = 'ApiError'; this.statusCode = statusCode; this.errorCode = errorCode; }
}

let toastFn: any = null;
export function setToastHandler(fn: any) { toastFn = fn; }
export function showToast(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') { toastFn?.(message, type); }

function setSessionCookie(token: string) {
  if (typeof document !== 'undefined') document.cookie = `admin_session=${token}; expires=${new Date(Date.now() + 7 * 86400000).toUTCString()}; path=/; SameSite=Lax`;
}
function clearSessionCookie() { if (typeof document !== 'undefined') document.cookie = 'admin_session=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'; }

export const api = axios.create({ baseURL: API_BASE, timeout: 15000, headers: { 'Content-Type': 'application/json' } });

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') { const t = localStorage.getItem('admin_token'); if (t) { config.headers.Authorization = `Bearer ${t}`; setSessionCookie(t); } }
  return config;
});

api.interceptors.response.use(
  (response) => { const b = response.data; if (b?.success === false) return Promise.reject(new ApiError(b?.message||'Hata', b?.statusCode||400)); return response; },
  async (error) => {
    if (error instanceof ApiError) return Promise.reject(error);
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url?.includes('/auth/login')) return Promise.reject(error);
      if (isRefreshing) return new Promise<string>((resolve, reject) => { failedQueue.push({ resolve, reject }); }).then((token) => { originalRequest.headers.Authorization = `Bearer ${token}`; return api(originalRequest); });
      originalRequest._retry = true; isRefreshing = true;
      const rt = localStorage.getItem('admin_refresh');
      if (rt) { try { const res = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken: rt }); const t = res.data?.data?.accessToken || res.data?.accessToken; const nr = res.data?.data?.refreshToken || res.data?.refreshToken; if (t) { localStorage.setItem('admin_token', t); if (nr) localStorage.setItem('admin_refresh', nr); setSessionCookie(t); api.defaults.headers.common.Authorization = `Bearer ${t}`; processQueue(null, t); return api(originalRequest); } } catch { processQueue(error, null); } }
      localStorage.removeItem('admin_token'); localStorage.removeItem('admin_refresh'); localStorage.removeItem('admin_user'); clearSessionCookie(); if (typeof window !== 'undefined') window.location.href = '/login'; return Promise.reject(error);
    }
    if (error.response) { const b = error.response.data; return Promise.reject(new ApiError(b?.message || b?.error || 'Sunucu hatası', error.response.status)); }
    if (error.code === 'ECONNABORTED') return Promise.reject(new ApiError('İstek zaman aşımı', 408));
    return Promise.reject(new ApiError(error.message || 'Ağ hatası', 0, 'NETWORK_ERROR'));
  },
);

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];
function processQueue(error: any, token: string | null = null) { failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token!)); failedQueue = []; }
