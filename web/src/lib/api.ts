import axios from 'axios';

const API_BASE = '/api/v1';

// Helper: set session cookie for middleware auth check (non-httpOnly, 7 day expiry)
function setSessionCookie(token: string) {
  if (typeof document !== 'undefined') {
    const expires = new Date(Date.now() + 7 * 86400000).toUTCString();
    document.cookie = `admin_session=${token}; expires=${expires}; path=/; SameSite=Lax`;
  }
}

function clearSessionCookie() {
  if (typeof document !== 'undefined') {
    document.cookie = 'admin_session=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  }
}

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach access token + sync cookie for middleware
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      setSessionCookie(token);
    }
  }
  return config;
});

// Response interceptor — handle 401 and refresh token
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((p) => {
    if (error) p.reject(error);
    else p.resolve(token!);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't redirect on login attempts
      if (originalRequest.url?.includes('/auth/login')) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('admin_refresh');
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
          const newAccessToken = res.data?.data?.accessToken;
          const newRefreshToken = res.data?.data?.refreshToken;

          if (newAccessToken) {
            localStorage.setItem('admin_token', newAccessToken);
            if (newRefreshToken) localStorage.setItem('admin_refresh', newRefreshToken);
            setSessionCookie(newAccessToken);

            api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
            processQueue(null, newAccessToken);
            return api(originalRequest);
          }
        } catch {
          processQueue(error, null);
        }
      }

      // Refresh failed — clear auth and redirect
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_refresh');
      localStorage.removeItem('admin_user');
      clearSessionCookie();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    return Promise.reject(error);
  },
);
