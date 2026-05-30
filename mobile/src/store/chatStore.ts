import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  getSocket, 
  subscribeToEvent, 
  joinChatRoom, 
  sendChatMessage, 
  createChatRoomBroadcast 
} from '../services/websocket';

const CHAT_ROOMS_KEY = '@chat_rooms_list';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
}

export interface ChatRoom {
  id: string;
  name: string;
  isGroup: boolean;
  participants: string[];
  participantNames: string[];
  messages: ChatMessage[];
  unreadCount?: number;
}

interface ChatState {
  chatRooms: Record<string, ChatRoom>;
  activeRoomId: string | null;
  isLoading: boolean;
  initializeChat: () => Promise<void>;
  createChatRoom: (participants: string[], participantNames: string[], name: string, isGroup?: boolean) => Promise<string>;
  sendMessage: (chatRoomId: string, text: string, senderId: string, senderName: string) => void;
  receiveMessage: (message: ChatMessage & { chatRoomId: string; participants: string[] }) => void;
  receiveNewChatRoom: (room: { id: string; name: string; isGroup: boolean; participants: string[]; participantNames: string[] }) => void;
  setActiveRoom: (roomId: string | null) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chatRooms: {},
  activeRoomId: null,
  isLoading: true,

  initializeChat: async () => {
    try {
      const stored = await AsyncStorage.getItem(CHAT_ROOMS_KEY);
      const rooms: Record<string, ChatRoom> = stored ? JSON.parse(stored) : {};
      
      set({ chatRooms: rooms, isLoading: false });

      // Join all existing chat rooms on WebSocket
      Object.keys(rooms).forEach(roomId => {
        joinChatRoom(roomId);
      });

      // Subscribe to WebSocket events
      subscribeToEvent('new_message', (payload: any) => {
        get().receiveMessage(payload);
      });

      subscribeToEvent('NEW_CHAT_ROOM', (payload: any) => {
        get().receiveNewChatRoom(payload);
      });
    } catch (err) {
      console.error('Error initializing chat store:', err);
      set({ isLoading: false });
    }
  },

  createChatRoom: async (participants, participantNames, name, isGroup = false) => {
    const { chatRooms } = get();
    
    // For 1-on-1 chats, check if a room already exists with these exact participants
    if (!isGroup) {
      const existing = Object.values(chatRooms).find(
        r => !r.isGroup && 
        r.participants.length === participants.length && 
        r.participants.every(p => participants.includes(p))
      );
      if (existing) {
        return existing.id;
      }
    }

    const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newRoom: ChatRoom = {
      id: roomId,
      name,
      isGroup,
      participants,
      participantNames,
      messages: [],
      unreadCount: 0
    };

    const updated = { ...chatRooms, [roomId]: newRoom };
    set({ chatRooms: updated });
    await AsyncStorage.setItem(CHAT_ROOMS_KEY, JSON.stringify(updated));

    // Emit via WebSocket so other participants receive it
    joinChatRoom(roomId);
    createChatRoomBroadcast({
      id: roomId,
      name,
      isGroup,
      participants,
      participantNames
    });

    return roomId;
  },

  sendMessage: (chatRoomId, text, senderId, senderName) => {
    const { chatRooms } = get();
    const room = chatRooms[chatRoomId];
    if (!room) return;

    const message: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      senderId,
      senderName,
      text,
      timestamp: new Date().toISOString()
    };

    // Emit over socket
    sendChatMessage({
      ...message,
      chatRoomId,
      participants: room.participants
    });
  },

  receiveMessage: async (payload) => {
    const { chatRooms, activeRoomId } = get();
    const { chatRoomId, ...msg } = payload;
    const room = chatRooms[chatRoomId];
    if (!room) return;

    // Check if message is already appended
    if (room.messages.some(m => m.id === msg.id)) return;

    const updatedMessages = [...room.messages, msg];
    const isCurrentActive = activeRoomId === chatRoomId;
    const currentUnread = room.unreadCount || 0;

    const updatedRoom = {
      ...room,
      messages: updatedMessages,
      unreadCount: isCurrentActive ? 0 : currentUnread + 1
    };

    const updatedRooms = { ...chatRooms, [chatRoomId]: updatedRoom };
    set({ chatRooms: updatedRooms });
    await AsyncStorage.setItem(CHAT_ROOMS_KEY, JSON.stringify(updatedRooms));
  },

  receiveNewChatRoom: async (payload) => {
    const { chatRooms } = get();
    if (chatRooms[payload.id]) return;

    const newRoom: ChatRoom = {
      id: payload.id,
      name: payload.name,
      isGroup: payload.isGroup,
      participants: payload.participants,
      participantNames: payload.participantNames,
      messages: [],
      unreadCount: 0
    };

    // Join room on Socket
    joinChatRoom(payload.id);

    const updated = { ...chatRooms, [payload.id]: newRoom };
    set({ chatRooms: updated });
    await AsyncStorage.setItem(CHAT_ROOMS_KEY, JSON.stringify(updated));
  },

  setActiveRoom: async (roomId) => {
    set({ activeRoomId: roomId });
    if (roomId) {
      const { chatRooms } = get();
      const room = chatRooms[roomId];
      if (room && (room.unreadCount || 0) > 0) {
        const updatedRoom = { ...room, unreadCount: 0 };
        const updated = { ...chatRooms, [roomId]: updatedRoom };
        set({ chatRooms: updated });
        await AsyncStorage.setItem(CHAT_ROOMS_KEY, JSON.stringify(updated));
      }
    }
  }
}));
