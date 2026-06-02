'use client';

import { io, Socket } from 'socket.io-client';
import { WS_EVENTS } from '@kaptan/shared';

/* ═══════════════════════════════════════════════════════════════
   KAPTAN WEB — WebSocket Client (mobile ile aynı event yapısı)
   Shared WS_EVENTS constants kullanır
   ═══════════════════════════════════════════════════════════════ */

let socket: Socket | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
const eventBuffer: Array<{ event: string; data: any }> = [];
const MAX_BUFFER = 50;

/* ── Bağlantı ───────────────────────────────────────────────── */

export function connectSocket(token: string): Socket {
  if (socket?.connected) return socket;

  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';

  socket = io(wsUrl, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    reconnectionAttempts: 20,
    randomizationFactor: 0.3,
  });

  socket.on('connect', () => {
    console.log('[WS] Connected:', socket?.id);
    startHeartbeat();
    flushEventBuffer();
  });

  socket.on('disconnect', (reason) => {
    console.log('[WS] Disconnected:', reason);
    stopHeartbeat();
  });

  socket.on('connect_error', (err) => {
    console.warn('[WS] Connection error:', err.message);
  });

  return socket;
}

export function disconnectSocket() {
  stopHeartbeat();
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket(): Socket | null {
  return socket;
}

/* ── Heartbeat ──────────────────────────────────────────────── */

function startHeartbeat() {
  stopHeartbeat();
  heartbeatTimer = setInterval(() => {
    socket?.emit('ping');
  }, 25000);
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

/* ── Event Yönetimi ─────────────────────────────────────────── */

export function subscribe(event: string, callback: (data: any) => void) {
  socket?.on(event, callback);
  return () => socket?.off(event, callback);
}

export function emit(event: string, data: any) {
  if (socket?.connected) {
    socket.emit(event, data);
  } else {
    // Offline buffer — bağlantı gelince gönder
    if (eventBuffer.length < MAX_BUFFER) {
      eventBuffer.push({ event, data });
    }
  }
}

function flushEventBuffer() {
  while (eventBuffer.length > 0) {
    const item = eventBuffer.shift();
    if (item) socket?.emit(item.event, item.data);
  }
}

/* ── Domain-specific helpers (shared event names) ───────────── */

export function onLoadCreated(cb: (data: any) => void) {
  return subscribe(WS_EVENTS.LOAD_CREATED, cb);
}

export function onLoadUpdated(cb: (data: any) => void) {
  return subscribe(WS_EVENTS.LOAD_UPDATED, cb);
}

export function onBidPlaced(cb: (data: any) => void) {
  return subscribe(WS_EVENTS.BID_PLACED, cb);
}

export function onBidAccepted(cb: (data: any) => void) {
  return subscribe(WS_EVENTS.BID_ACCEPTED, cb);
}

export function onTrackingUpdate(cb: (data: any) => void) {
  return subscribe(WS_EVENTS.TRACKING_UPDATE, cb);
}

export function onNotification(cb: (data: any) => void) {
  return subscribe(WS_EVENTS.NOTIFICATION_NEW, cb);
}

export function onWalletChange(cb: (data: any) => void) {
  return subscribe(WS_EVENTS.WALLET_BALANCE, cb);
}

export function onChatMessage(cb: (data: any) => void) {
  return subscribe(WS_EVENTS.CHAT_MESSAGE, cb);
}
