import {
  WebSocketGateway as WSGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { ChatService } from '../chat/chat.service';

@WSGateway({
  cors: {
    origin: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:8081').split(',').map((o) => o.trim()),
    credentials: true,
  },
  namespace: '/ws',
  transports: ['websocket', 'polling'],
})
export class WebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(WebSocketGateway.name);

  constructor(
    @Inject(forwardRef(() => ChatService))
    private chatService: ChatService,
  ) {}

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    const role = client.handshake.query.role as string;
    if (userId) {
      client.join(`user:${userId}`);
      if (role) client.join(`role:${role}`);
      this.logger.debug(`WS connected: user ${userId} (${role || 'unknown'})`);
    }
  }

  handleDisconnect(client: Socket) {
    // Redis adapter handles room cleanup automatically
    this.logger.debug(`WS disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(client: Socket, payload: { room: string }) {
    client.join(payload.room);
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(client: Socket, payload: { room: string }) {
    client.leave(payload.room);
  }

  sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, {
      ...data,
      _timestamp: new Date().toISOString(),
    });
  }

  sendToRoom(room: string, event: string, data: any) {
    this.server.to(room).emit(event, {
      ...data,
      _timestamp: new Date().toISOString(),
    });
  }

  broadcastToAll(event: string, data: any) {
    this.server.emit(event, {
      ...data,
      _timestamp: new Date().toISOString(),
    });
  }

  // Check if a user is online (Redis-adapter compatible)
  async isUserOnline(userId: string): Promise<boolean> {
    try {
      const sockets = await this.server.in(`user:${userId}`).fetchSockets();
      return sockets.length > 0;
    } catch {
      return false;
    }
  }

  // ======== Return Load Events ========

  emitNewReturnLoad(userId: string, loadData: any) {
    this.sendToUser(userId, 'NEW_RETURN_LOAD', { load: loadData });
  }

  emitLoadReserved(userId: string, loadId: string, reservedBy: string) {
    this.sendToUser(userId, 'LOAD_RESERVED', { loadId, reservedBy });
  }

  emitLoadExpired(loadId: string, room: string) {
    this.sendToRoom(room, 'LOAD_EXPIRED', { loadId });
  }

  emitNewBid(loadId: string, bidData: any) {
    this.server.to(`load:${loadId}`).emit('NEW_BID', {
      ...bidData,
      _timestamp: new Date().toISOString(),
    });
  }

  emitBidAccepted(userId: string, loadId: string, bidId: string) {
    this.sendToUser(userId, 'BID_ACCEPTED', { loadId, bidId });
  }

  emitBidRejected(userId: string, loadId: string, bidId: string) {
    this.sendToUser(userId, 'BID_REJECTED', { loadId, bidId });
  }

  emitFilterMatch(userId: string, loadData: any) {
    this.sendToUser(userId, 'FILTER_MATCH', { load: loadData });
  }

  emitRouteMatch(userId: string, loadData: any) {
    this.sendToUser(userId, 'ROUTE_MATCH', { load: loadData });
  }

  // ======== Escrow / Payment Events ========

  sendToShipment(loadId: string, event: string, data: any) {
    this.sendToRoom(`shipment:${loadId}`, event, data);
  }

  sendToWallet(userId: string, event: string, data: any) {
    this.sendToRoom(`wallet:${userId}`, event, data);
  }

  sendToDispute(disputeId: string, event: string, data: any) {
    this.sendToRoom(`dispute:${disputeId}`, event, data);
  }

  emitEscrowCreated(loadId: string, escrowData: any) {
    this.sendToShipment(loadId, 'ESCROW_CREATED', escrowData);
  }

  emitEscrowFundsLocked(loadId: string, escrowData: any) {
    this.sendToShipment(loadId, 'ESCROW_FUNDS_LOCKED', escrowData);
  }

  emitEscrowReleased(loadId: string, escrowData: any) {
    this.sendToShipment(loadId, 'ESCROW_RELEASED', escrowData);
  }

  emitEscrowDisputed(loadId: string, disputeData: any) {
    this.sendToShipment(loadId, 'ESCROW_DISPUTED', disputeData);
  }

  // ======== Spec 02/03: Missing Events ========

  emitCounterBid(bidderId: string, loadId: string, counterData: any) {
    this.sendToUser(bidderId, 'COUNTER_BID', { loadId, ...counterData });
  }

  emitBidExpired(bidderId: string, loadId: string, bidId: string) {
    this.sendToUser(bidderId, 'BID_EXPIRED', { loadId, bidId });
  }

  emitPaymentReleased(userId: string, loadId: string, amount: number) {
    this.sendToUser(userId, 'PAYMENT_RELEASED', { loadId, amount, timestamp: new Date().toISOString() });
  }

  emitNewLoad(loadData: any) {
    this.broadcastToAll('NEW_LOAD', { load: loadData });
  }

  // ======== Automated Reload Events ========

  @SubscribeMessage('accept_reload_bundle')
  handleAcceptReloadBundle(client: Socket, payload: { bundleId: string; carrierId: string; acceptedLoadIds?: string[] }) {
    this.sendToRoom(`carrier:${payload.carrierId}`, 'RELOAD_BUNDLE_ACCEPTED', {
      bundleId: payload.bundleId,
      acceptedLoadIds: payload.acceptedLoadIds,
    });
  }

  @SubscribeMessage('decline_reload_bundle')
  handleDeclineReloadBundle(client: Socket, payload: { bundleId: string; carrierId: string }) {
    this.sendToUser(payload.carrierId, 'RELOAD_BUNDLE_DECLINED', {
      bundleId: payload.bundleId,
    });
  }

  emitReloadSuggestion(carrierId: string, bundle: any) {
    this.sendToUser(carrierId, 'AUTOMATED_RELOAD', {
      bundleId: bundle.id,
      backhaulCount: bundle.backhaulLoads?.length || 0,
      totalEarnings: bundle.totalEarnings,
      emptyKmSaved: bundle.emptyKmSaved,
      expiresAt: bundle.expiresAt,
      message: `${bundle.backhaulLoads?.length || 0} dönüş yükü bulundu! Boş dönme!`,
    });
  }

  // ======== Active Chat / Messaging Events ========

  @SubscribeMessage('send_message')
  async handleSendMessage(client: Socket, payload: { id: string; senderId: string; senderName: string; text: string; chatRoomId: string; timestamp: string; participants: string[] }) {
    // Persist message to database via ChatService
    try {
      await this.chatService.sendMessage({
        roomId: payload.chatRoomId,
        senderId: payload.senderId,
        senderName: payload.senderName,
        text: payload.text,
      });
    } catch (err) {
      this.logger.error(`Failed to persist chat message: ${err}`);
    }

    // Broadcast to room
    this.server.to(`chatroom:${payload.chatRoomId}`).emit('new_message', payload);

    // Also notify participants
    if (payload.participants) {
      payload.participants.forEach(pId => {
        if (pId !== payload.senderId) {
          this.sendToUser(pId, 'CHAT_NOTIFICATION', {
            chatRoomId: payload.chatRoomId,
            senderName: payload.senderName,
            text: payload.text,
          });
        }
      });
    }
  }

  @SubscribeMessage('create_room')
  async handleCreateRoom(client: Socket, payload: { id: string; name: string; isGroup: boolean; participants: string[]; participantNames: string[] }) {
    // Persist room to database via ChatService
    try {
      await this.chatService.createRoom({
        name: payload.name,
        isGroup: payload.isGroup,
        participantIds: payload.participants,
        participantNames: payload.participantNames,
      });
    } catch (err) {
      this.logger.error(`Failed to persist chat room: ${err}`);
    }

    if (payload.participants) {
      payload.participants.forEach(pId => {
        this.sendToUser(pId, 'NEW_CHAT_ROOM', payload);
      });
    }
  }

  @SubscribeMessage('join_room')
  handleJoinRoom(client: Socket, payload: { roomId: string }) {
    client.join(`chatroom:${payload.roomId}`);
  }

  @SubscribeMessage('leave_room')
  handleLeaveRoom(client: Socket, payload: { roomId: string }) {
    client.leave(`chatroom:${payload.roomId}`);
  }

  @SubscribeMessage('typing')
  handleTyping(client: Socket, payload: { roomId: string; userId: string; userName: string }) {
    this.server.to(`chatroom:${payload.roomId}`).emit('user_typing', {
      userId: payload.userId,
      userName: payload.userName,
    });
  }

  // ======== Voice Command Events ========

  @SubscribeMessage('voice_command')
  handleVoiceCommand(client: Socket, payload: { command: string; userId: string; language?: string }) {
    this.logger.log(`Voice command from ${payload.userId}: "${payload.command}"`);
    // Emit to voice processing queue
    this.sendToUser(payload.userId, 'VOICE_COMMAND_RECEIVED', {
      command: payload.command,
      language: payload.language || 'tr-TR',
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('voice_command_result')
  handleVoiceCommandResult(client: Socket, payload: { userId: string; command: string; result: any; success: boolean }) {
    this.sendToUser(payload.userId, 'VOICE_RESULT', {
      command: payload.command,
      result: payload.result,
      success: payload.success,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('text_to_speech')
  handleTextToSpeech(client: Socket, payload: { userId: string; text: string; language?: string }) {
    this.sendToUser(payload.userId, 'TTS_REQUEST', {
      text: payload.text,
      language: payload.language || 'tr-TR',
    });
  }

  emitVoiceResult(userId: string, command: string, result: any) {
    this.sendToUser(userId, 'VOICE_RESULT', { command, result });
  }

  // ── EX-011: Live Tracking Broadcast ─────────────────

  @SubscribeMessage('tracking_update')
  handleTrackingUpdate(client: Socket, payload: { loadId: string; driverId: string; lat: number; lng: number; speed: number; heading: number; timestamp: string }) {
    // Broadcast to load tracking room
    this.server.to(`load:${payload.loadId}`).emit('TRACKING_UPDATE', payload);
    // Also notify load creator/shipper
    this.sendToRoom(`load:${payload.loadId}`, 'TRACKING_UPDATE', payload);
  }

  @SubscribeMessage('subscribe_load_tracking')
  handleSubscribeLoadTracking(client: Socket, payload: { loadId: string }) {
    client.join(`load:${payload.loadId}`);
  }

  /** EX-011: Broadcast tracking data from backend (called by TrackingService) */
  broadcastTrackingUpdate(loadId: string, data: { lat: number; lng: number; speed: number; heading: number; driverId: string; timestamp: string }) {
    this.server.to(`load:${loadId}`).emit('TRACKING_UPDATE', data);
  }

  /** EX-011: Emit real-time bid status changes */
  emitBidStatusChange(bidderId: string, status: string, data: any) {
    this.sendToUser(bidderId, 'BID_STATUS_CHANGE', { status, ...data });
  }
}
