import { apiClient } from './api';

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

export const notificationService = {
  getAll: async (page = 1): Promise<NotificationResponse> => {
    const res = await apiClient.get('/notifications', { params: { page } });
    return res.data.data;
  },

  getUnreadCount: async (): Promise<number> => {
    const res = await apiClient.get('/notifications/unread-count');
    return res.data.data.count;
  },

  markAsRead: async (id: string): Promise<void> => {
    await apiClient.put(`/notifications/${id}/read`);
  },

  markAllAsRead: async (): Promise<void> => {
    await apiClient.put('/notifications/read-all');
  },
};
