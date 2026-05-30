/** WebSocket event payloads for type-safe event handling */

export interface BidAcceptedPayload {
  loadId: string;
  amount: number;
}

export interface BidRejectedPayload {
  loadId: string;
}

export interface CounterBidPayload {
  loadId: string;
  counterAmount: number;
}

export interface NotificationPayload {
  type: 'new_bid' | 'bid_accepted' | 'bid_rejected' | 'escrow_locked'
    | 'escrow_released' | 'delivery_confirmed' | 'new_load_match'
    | 'dispute_opened' | 'price_alert';
  title?: string;
  message?: string;
  data?: {
    loadId?: string;
  };
}

export interface ChatMessagePayload {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  chatRoomId: string;
  timestamp: string;
  participants: string[];
}

export interface ChatRoomPayload {
  id: string;
  name: string;
  isGroup: boolean;
  participants: string[];
  participantNames: string[];
}

export interface TrackingUpdatePayload {
  loadId: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  timestamp: string;
}

export interface ProfileVerifiedPayload {
  userId: string;
}

export interface ProfileRejectedPayload {
  userId: string;
  notes?: string;
}

export type WSEventMap = {
  NOTIFICATION: NotificationPayload;
  new_bid: { loadId: string };
  BID_STATUS_CHANGE: {};
  CHAT_NOTIFICATION: {};
  new_message: ChatMessagePayload;
  NEW_CHAT_ROOM: ChatRoomPayload;
  bid_accepted: BidAcceptedPayload;
  bid_rejected: BidRejectedPayload;
  counter_bid: CounterBidPayload;
  PROFILE_VERIFIED: ProfileVerifiedPayload;
  PROFILE_REJECTED: ProfileRejectedPayload;
  PROFILE_STATUS_CHANGE: {};
  tracking_update: TrackingUpdatePayload;
};
