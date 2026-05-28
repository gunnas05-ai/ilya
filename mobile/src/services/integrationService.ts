import { apiClient } from './api';

export interface WebhookData {
  id?: string;
  name: string;
  url: string;
  events: string[];
  secret?: string;
  isActive?: boolean;
  successCount?: number;
  failureCount?: number;
  lastSentAt?: string;
  lastError?: string;
  createdAt?: string;
}

export interface ApiKeyData {
  id?: string;
  name: string;
  key?: string;
  keyPrefix?: string;
  permissions?: string[];
  rateLimitPerHour?: number;
  usageCount?: number;
  lastUsedAt?: string;
  expiresAt?: string;
  isActive?: boolean;
  createdAt?: string;
}

export const integrationService = {
  // Webhooks
  listWebhooks: async (): Promise<WebhookData[]> => {
    const res = await apiClient.get('/integrations/webhooks');
    return res.data?.data || res.data || [];
  },

  createWebhook: async (data: { name: string; url: string; events: string[]; secret?: string }) => {
    const res = await apiClient.post('/integrations/webhooks', data);
    return res.data?.data || res.data;
  },

  updateWebhook: async (id: string, data: Partial<WebhookData>) => {
    const res = await apiClient.put(`/integrations/webhooks/${id}`, data);
    return res.data?.data || res.data;
  },

  deleteWebhook: async (id: string) => {
    const res = await apiClient.delete(`/integrations/webhooks/${id}`);
    return res.data?.data || res.data;
  },

  toggleWebhook: async (id: string) => {
    const res = await apiClient.post(`/integrations/webhooks/${id}/toggle`);
    return res.data?.data || res.data;
  },

  // API Keys
  listApiKeys: async (): Promise<ApiKeyData[]> => {
    const res = await apiClient.get('/integrations/api-keys');
    return res.data?.data || res.data || [];
  },

  generateApiKey: async (data: { name: string; permissions?: string[]; rateLimitPerHour?: number }) => {
    const res = await apiClient.post('/integrations/api-keys', data);
    return res.data?.data || res.data;
  },

  revokeApiKey: async (id: string) => {
    const res = await apiClient.post(`/integrations/api-keys/${id}/revoke`);
    return res.data?.data || res.data;
  },

  deleteApiKey: async (id: string) => {
    const res = await apiClient.delete(`/integrations/api-keys/${id}`);
    return res.data?.data || res.data;
  },
};
