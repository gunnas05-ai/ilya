'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { connectSocket, subscribe, getSocket } from './websocket';
import { WS_EVENTS } from '@kaptan/shared';

/* ═══════════════════════════════════════════════════════════════
   KAPTAN WEB — Realtime Notification Hook
   mobil ile aynı WebSocket event'lerini dinler
   Bildirim senkronu: bir cihazda okundu → diğerinde de okundu
   ═══════════════════════════════════════════════════════════════ */

interface LiveNotification {
  id: string;
  title: string;
  body: string;
  type: 'info' | 'warning' | 'success' | 'error';
  isRead: boolean;
  createdAt: string;
}

export function useRealtimeNotifications() {
  const [notifications, setNotifications] = useState<LiveNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const wsConnected = useRef(false);

  const connect = useCallback(() => {
    const token = localStorage.getItem('admin_token');
    if (!token || wsConnected.current) return;

    const socket = connectSocket(token);

    socket.on('connect', () => {
      wsConnected.current = true;
    });

    socket.on('disconnect', () => {
      wsConnected.current = false;
    });

    // Yeni bildirim
    subscribe(WS_EVENTS.NOTIFICATION_NEW, (data: LiveNotification) => {
      setNotifications(prev => [data, ...prev].slice(0, 50));
      setUnreadCount(c => c + 1);

      // Tarayıcı bildirimi (izin varsa)
      if (Notification.permission === 'granted') {
        new Notification(data.title, { body: data.body, icon: '/favicon.ico' });
      }
    });

    // Okundu işareti (diğer cihazdan)
    subscribe(WS_EVENTS.NOTIFICATION_READ, (data: { id: string }) => {
      setNotifications(prev => prev.map(n => n.id === data.id ? { ...n, isRead: true } : n));
      setUnreadCount(c => Math.max(0, c - 1));
    });
  }, []);

  useEffect(() => {
    connect();
    // Tarayıcı bildirim izni iste
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
    return () => {
      wsConnected.current = false;
    };
  }, [connect]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount(c => Math.max(0, c - 1));
    getSocket()?.emit(WS_EVENTS.NOTIFICATION_READ, { id });
  }, []);

  return { notifications, unreadCount, markAsRead };
}
