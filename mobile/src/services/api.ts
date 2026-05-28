import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../constants/config';
import { getTokens, saveTokens, clearSession } from './secureStorage';

const OLD_TOKEN_KEY = '@auth_tokens';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(async (config) => {
  try {
    // Önce yeni güvenli depolamadan dene
    let tokens = await getTokens();

    // Eski AsyncStorage'da token varsa migrate et
    if (!tokens) {
      const raw = await AsyncStorage.getItem(OLD_TOKEN_KEY);
      if (raw) {
        tokens = JSON.parse(raw);
        if (tokens?.accessToken) {
          await saveTokens(tokens.accessToken, tokens.refreshToken || '');
          await AsyncStorage.removeItem(OLD_TOKEN_KEY);
        }
      }
    }

    if (tokens?.accessToken) {
      config.headers.Authorization = `Bearer ${tokens.accessToken}`;
    }
  } catch {
    // ignore
  }
  return config;
});

let isRefreshing = false;
let pendingQueue: Array<{ resolve: (val: any) => void; reject: (err: any) => void }> = [];

function processQueue(error: any, token: string | null = null) {
  pendingQueue.forEach((p) => {
    if (error) p.reject(error);
    else p.resolve(token);
  });
  pendingQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        });
      }
      originalRequest._retry = true;
      isRefreshing = true;
      try {
        const tokens = await getTokens();
        if (!tokens?.refreshToken) throw new Error('No refresh token');
        const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken: tokens.refreshToken });
        const { accessToken, refreshToken: newRefresh } = res.data.data || res.data;
        await saveTokens(accessToken, newRefresh || tokens.refreshToken);
        processQueue(null, accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await clearSession();
        await AsyncStorage.multiRemove([OLD_TOKEN_KEY, '@auth_user']);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  },
);
