import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../constants/config';
import type { WSEventMap } from '../types/websocket';

let socket: Socket | null = null;

export function connectSocket(token: string, userId?: string): Socket {
  if (socket?.connected) return socket;

  const wsUrl = API_BASE_URL.replace(/\/api.*$/, '');
  socket = io(`${wsUrl}/ws`, {
    auth: { token },
    query: userId ? { userId } : undefined,
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
  });

  socket.on('connect', () => {
    if (userId) {
      subscribeToUser(userId);
    }
  });
  socket.on('disconnect', () => {});
  socket.on('connect_error', (err) => console.warn('WS connect error:', err.message));

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
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
