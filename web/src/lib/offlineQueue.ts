/* ═══════════════════════════════════════════════════════════════
   KAPTAN WEB — Offline Queue (mobile offlineQueue.ts ile aynı)
   İnternet yokken istekleri sıraya al, bağlantı gelince gönder
   ═══════════════════════════════════════════════════════════════ */

import { api } from './api';

interface QueuedRequest {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  data?: any;
  timestamp: number;
  retries: number;
}

const STORAGE_KEY = 'kaptan_offline_queue';
const MAX_QUEUE = 200;
const MAX_RETRIES = 5;

let queue: QueuedRequest[] = [];
let flushing = false;

/* ── Queue Yönetimi ──────────────────────────────────────────── */

function loadQueue(): QueuedRequest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // Storage full — drop oldest
    queue.shift();
    saveQueue();
  }
}

export function initOfflineQueue() {
  queue = loadQueue();

  // Online olunca flush
  window.addEventListener('online', () => {
    flushQueue();
  });

  // Periyodik deneme
  setInterval(() => {
    if (navigator.onLine && queue.length > 0) {
      flushQueue();
    }
  }, 30000);
}

/* ── Enqueue ─────────────────────────────────────────────────── */

export function enqueue(method: QueuedRequest['method'], url: string, data?: any): string {
  if (queue.length >= MAX_QUEUE) {
    console.warn('[OfflineQueue] Kuyruk dolu, en eski istek atiliyor');
    queue.shift();
  }

  const id = crypto.randomUUID();
  queue.push({ id, method, url, data, timestamp: Date.now(), retries: 0 });
  saveQueue();
  return id;
}

/* ── Flush ───────────────────────────────────────────────────── */

export async function flushQueue(): Promise<void> {
  if (flushing || queue.length === 0) return;
  flushing = true;

  const items = [...queue];
  const failed: QueuedRequest[] = [];

  for (const item of items) {
    try {
      await api.request({ method: item.method, url: item.url, data: item.data });
    } catch (err: any) {
      // 409 Conflict → zaten işlenmiş, skip
      if (err.response?.status === 409) continue;

      item.retries++;
      if (item.retries < MAX_RETRIES) {
        failed.push(item);
      } else {
        console.warn(`[OfflineQueue] İstek ${item.id} ${MAX_RETRIES} deneme sonunda atildi`);
      }
    }
  }

  queue = failed;
  saveQueue();
  flushing = false;
}

/* ── Status ──────────────────────────────────────────────────── */

export function getQueueLength(): number {
  return queue.length;
}

export function clearQueue() {
  queue = [];
  saveQueue();
}
