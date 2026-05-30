/**
 * Kullanim analitigi — event tracking.
 * Event'leri batch olarak backend'e gonderir. KVKK uyumlu.
 */
import { apiClient } from './api';

interface TrackEvent {
  name: string;
  props?: Record<string, any>;
  ts: string;
}

const MAX_BATCH = 20;
const FLUSH_MS = 30000;

let queue: TrackEvent[] = [];
let timer: ReturnType<typeof setInterval> | null = null;

async function doFlush() {
  if (queue.length === 0) return;
  const batch = queue.splice(0, MAX_BATCH);
  try { await apiClient.post('/analytics/events', { events: batch }); } catch {}
}

function ensureTimer() {
  if (!timer) timer = setInterval(doFlush, FLUSH_MS);
}

export const usageAnalytics = {
  track(name: string, props?: Record<string, any>) {
    if (__DEV__) return;
    queue.push({ name, props, ts: new Date().toISOString() });
    if (queue.length >= MAX_BATCH) doFlush();
    ensureTimer();
  },

  screen(name: string) { this.track('screen_view', { screen: name }); },
  tap(button: string, screen?: string) { this.track('tap', { button, screen }); },
  error(type: string, msg: string, screen?: string) { this.track('error', { type, message: msg, screen }); },
  identify(uid: string, traits?: Record<string, any>) { this.track('identify', { userId: uid, ...traits }); },
  flush: doFlush,
};
