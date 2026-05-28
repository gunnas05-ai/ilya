import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../constants/config';

let socket: Socket | null = null;

export function connectSocket(token: string, userId?: string): Socket {
  if (socket?.connected) return socket;

  const wsUrl = API_BASE_URL.replace('/api', '');
  socket = io(`${wsUrl}/ws`, {
    auth: { token },
    query: userId ? { userId } : undefined,
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    console.log('WS connected');
    if (userId) {
      subscribeToUser(userId);
    }
  });
  socket.on('disconnect', (reason) => console.log('WS disconnected:', reason));
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

export function subscribeToEvent(event: string, handler: (...args: any[]) => void) {
  socket?.on(event, handler);
  return () => {
    socket?.off(event, handler);
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
