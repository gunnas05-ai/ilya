import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { apiClient } from './api';

const QUEUE_KEY = '@offline_queue';
const MAX_QUEUE_SIZE = 200;
const MAX_RETRIES = 5;

export interface OfflineRequest {
  id: string;
  url: string;
  method: 'POST' | 'PUT' | 'PATCH';
  data: any;
  timestamp: number;
  retryCount: number;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export async function queueRequest(
  url: string,
  method: 'POST' | 'PUT' | 'PATCH',
  data?: any,
): Promise<{ offline: boolean; message?: string }> {
  const state = await NetInfo.fetch();

  if (!state.isConnected) {
    const rawQueue = await AsyncStorage.getItem(QUEUE_KEY);
    const queue: OfflineRequest[] = rawQueue ? JSON.parse(rawQueue) : [];

    if (queue.length >= MAX_QUEUE_SIZE) {
      return { offline: true, message: 'Kuyruk dolu. İnternet bağlantısı gerekiyor.' };
    }

    queue.push({
      id: generateId(),
      url,
      method,
      data,
      timestamp: Date.now(),
      retryCount: 0,
    });

    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    return { offline: true, message: 'İnternet bağlantısı yok. İstek kuyruğa alındı.' };
  }

  try {
    await apiClient.request({ url, method, data });
  } catch {
    const rawQueue = await AsyncStorage.getItem(QUEUE_KEY);
    const queue: OfflineRequest[] = rawQueue ? JSON.parse(rawQueue) : [];
    queue.push({
      id: generateId(),
      url,
      method,
      data,
      timestamp: Date.now(),
      retryCount: 0,
    });
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }

  return { offline: false };
}

let processingLock = false;

NetInfo.addEventListener((state) => {
  if (state.isConnected) {
    processOfflineQueue();
  }
});

export async function processOfflineQueue(): Promise<void> {
  if (processingLock) return;
  processingLock = true;

  try {
    const rawQueue = await AsyncStorage.getItem(QUEUE_KEY);
    if (!rawQueue) return;

    const queue: OfflineRequest[] = JSON.parse(rawQueue);
    if (queue.length === 0) return;

    const remaining: OfflineRequest[] = [];

    for (const req of queue) {
      try {
        await apiClient.request({
          url: req.url,
          method: req.method,
          data: req.data,
        });
      } catch {
        req.retryCount += 1;
        if (req.retryCount < MAX_RETRIES) {
          remaining.push(req);
        } else {
          console.warn(
            `[OfflineQueue] İstek ${MAX_RETRIES} deneme sonunda başarısız, atılıyor: ${req.method} ${req.url}`,
          );
        }
      }
    }

    if (remaining.length > 0) {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
    } else {
      await AsyncStorage.removeItem(QUEUE_KEY);
    }
  } finally {
    processingLock = false;
  }
}
