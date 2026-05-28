import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { apiClient } from './api';

const QUEUE_KEY = '@offline_queue';

export interface OfflineRequest {
  id: string;
  url: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'GET';
  data: any;
  timestamp: number;
}

export async function queueRequest(url: string, method: 'POST' | 'PUT' | 'PATCH' | 'GET', data?: any) {
  const state = await NetInfo.fetch();
  
  if (!state.isConnected) {
    const rawQueue = await AsyncStorage.getItem(QUEUE_KEY);
    const queue: OfflineRequest[] = rawQueue ? JSON.parse(rawQueue) : [];
    
    queue.push({
      id: Math.random().toString(36).substr(2, 9),
      url,
      method,
      data,
      timestamp: Date.now()
    });
    
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    return { offline: true, message: "İnternet bağlantısı yok. İstek kuyruğa alındı." };
  }

  // If connected, just send immediately
  if (method === 'GET') {
    return apiClient.get(url, { params: data });
  }
  return apiClient.request({ url, method, data });
}

// Global listener to process queue when internet comes back
NetInfo.addEventListener(state => {
  if (state.isConnected) {
    processOfflineQueue();
  }
});

export const offlineQueue = {
  enqueue: (data: any) => queueRequest(data.url, data.method || 'POST', data),
};

export async function processOfflineQueue() {
  const rawQueue = await AsyncStorage.getItem(QUEUE_KEY);
  if (!rawQueue) return;
  
  const queue: OfflineRequest[] = JSON.parse(rawQueue);
  if (queue.length === 0) return;

  console.log(`Processing offline queue... ${queue.length} items`);

  for (const req of queue) {
    try {
      if (req.method === 'GET') {
        await apiClient.get(req.url, { params: req.data });
      } else {
        await apiClient.request({
          url: req.url,
          method: req.method,
          data: req.data
        });
      }
    } catch (err) {
      console.log(`Çevrimdışı istek iletim hatası (${req.url}):`, err);
    }
  }

  await AsyncStorage.removeItem(QUEUE_KEY);
}
