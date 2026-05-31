import { io, Socket } from 'socket.io-client';
import { API_BASE_URL, APP_CONFIG } from '../constants/config';
import type { WSEventMap } from '../types/websocket';

let socket: Socket | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let pongTimeout: ReturnType<typeof setTimeout> | null = null;

export function connectSocket(token: string, userId?: string): Socket {
  if (socket?.connected) return socket;

  const wsUrl = APP_CONFIG.wsUrl || API_BASE_URL.replace(/\/api.*$/, '');
  socket = io(`${wsUrl}/ws`, {
    auth: { token },
    query: userId ? { userId } : undefined,
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
    timeout: 20000,
  });

  socket.on('connect', () => {
    if (userId) {
      subscribeToUser(userId);
    }
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = setInterval(() => {
      if (socket?.connected) {
        socket.emit('ping');
        // 5s timeout: pong gelmezse baglantiyi koparip yeniden baglan
        if (pongTimeout) clearTimeout(pongTimeout);
        pongTimeout = setTimeout(() => {
          console.warn('WS heartbeat timeout — reconnecting...');
          socket?.disconnect();
          socket?.connect();
        }, 5000);
      }
    }, 25000);
  });

  socket.on('pong', () => {
    if (pongTimeout) { clearTimeout(pongTimeout); pongTimeout = null; }
  });

  socket.on('disconnect', () => {
    if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
    if (pongTimeout) { clearTimeout(pongTimeout); pongTimeout = null; }
  });

  socket.on('connect_error', (err) => console.warn('WS connect error:', err.message));

  return socket;
}

export function disconnectSocket() {
  if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
  if (pongTimeout) { clearTimeout(pongTimeout); pongTimeout = null; }
  if (socket) { socket.disconnect(); socket = null; }
}

export function getSocket(): Socket | null {
  return socket;
}

export function subscribeToEvent<K extends keyof WSEventMap>(
  event: K,
  handler: (payload: WSEventMap[K]) => void,
): () => void {
  socket?.on(event as string, handler as (...args: any[]) => void);
  return () => {
    socket?.off(event as string, handler as (...args: any[]) => void);
  };
}

export function subscribeToUser(userId: string) {
  socket?.emit('subscribe', { room: `user:${userId}` });
}

export function unsubscribeFromUser(userId: string) {
  socket?.emit('unsubscribe', { room: `user:${userId}` });
}

export function joinChatRoom(chatRoomId: string) {
  socket?.emit('subscribe', { room: `chatroom:${chatRoomId}` });
}

export function leaveChatRoom(chatRoomId: string) {
  socket?.emit('unsubscribe', { room: `chatroom:${chatRoomId}` });
}

export function sendChatMessage(messageData: { id: string; senderId: string; senderName: string; text: string; chatRoomId: string; timestamp: string; participants: string[] }) {
  socket?.emit('send_message', messageData);
}

export function createChatRoomBroadcast(roomData: { id: string; name: string; isGroup: boolean; participants: string[]; participantNames: string[] }) {
  socket?.emit('create_room', roomData);
}
