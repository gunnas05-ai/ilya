import { Platform } from 'react-native';
import { apiClient } from './api';
import { showToast } from '../utils/toast';
import { isFeatureEnabled } from '../constants/config';

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data: any;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationResponse {
  notifications: NotificationItem[];
  total: number;
  page: number;
  unreadCount: number;
}

let cachedToken: string | null = null;

export const notificationService = {
  getAll: async (page = 1): Promise<NotificationResponse> => {
    const res = await apiClient.get('/notifications', { params: { page } });
    return res.data?.data || res.data;
  },

  getUnreadCount: async (): Promise<number> => {
    try {
      const res = await apiClient.get('/notifications/unread-count');
      return res.data?.data?.count || res.data?.count || 0;
    } catch { return 0; }
  },

  markAsRead: async (id: string): Promise<void> => {
    await apiClient.put(`/notifications/${id}/read`);
  },

  markAllAsRead: async (): Promise<void> => {
    await apiClient.put('/notifications/read-all');
  },

  /** Push notification token'ini backend'e kaydeder */
  registerPushToken: async (token: string): Promise<void> => {
    if (!isFeatureEnabled('enablePushNotifications')) return;
    if (token === cachedToken) return;
    try {
      await apiClient.post('/notifications/register-push-token', {
        token,
        platform: Platform.OS,
      });
      cachedToken = token;
    } catch { /* token kaydi sessizce basarisiz olabilir */ }
  },

  /** Fuel price alert olustur */
  createFuelAlert: async (data: {
    stationId: string;
    fuelType: string;
    targetPrice: number;
    notifyOnDrop: boolean;
  }): Promise<void> => {
    if (!isFeatureEnabled('enableFuelAlerts')) return;
    await apiClient.post('/fuel-stations/alerts', data);
    showToast('Fiyat alarmı oluşturuldu.', 'success');
  },

  /** Bildirim tercihleri */
  getPreferences: async () => {
    const res = await apiClient.get('/notifications/preferences');
    return res.data?.data || res.data || {};
  },

  /** Bildirim tercihlerini guncelle */
  updatePreferences: async (prefs: Record<string, boolean>): Promise<void> => {
    await apiClient.put('/notifications/preferences', prefs);
  },
};
