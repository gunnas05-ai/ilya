import { apiClient } from './api';

export interface AnnouncementData {
  content: string;
  updatedAt: string;
}

export const announcementService = {
  getLatest: async (): Promise<AnnouncementData | null> => {
    const res = await apiClient.get('/announcements/latest');
    // transformInterceptor wraps as { success: true, data: ... }
    return res.data?.data || null;
  },

  save: async (content: string): Promise<AnnouncementData> => {
    const res = await apiClient.post('/announcements', { content });
    return res.data?.data;
  },
};
