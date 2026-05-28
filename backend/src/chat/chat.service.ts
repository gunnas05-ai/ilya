import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThan, MoreThan } from 'typeorm';
import { ChatRoom } from './chat-room.entity';
import { ChatMessage } from './chat-message.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatRoom)
    private roomRepo: Repository<ChatRoom>,
    @InjectRepository(ChatMessage)
    private msgRepo: Repository<ChatMessage>,
  ) {}

  // ── Room CRUD ──

  async createRoom(data: { name?: string; isGroup?: boolean; participantIds: string[]; participantNames?: string[]; createdBy?: string }) {
    const room = this.roomRepo.create({
      name: data.name || data.participantNames?.join(', ') || 'Sohbet',
      isGroup: data.isGroup ?? (data.participantIds.length > 2),
      participantIds: data.participantIds,
      participantNames: data.participantNames || [],
      createdBy: data.createdBy,
      isActive: true,
      lastActivity: new Date(),
    });
    return this.roomRepo.save(room);
  }

  async getUserRooms(userId: string): Promise<ChatRoom[]> {
    return this.roomRepo.find({
      where: { isActive: true },
      order: { lastActivity: 'DESC' },
    }).then(rooms => rooms.filter(r => r.participantIds?.includes(userId)));
  }

  async getRoom(roomId: string): Promise<ChatRoom> {
    const room = await this.roomRepo.findOne({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Sohbet odası bulunamadı');
    return room;
  }

  async getRoomByParticipants(participantIds: string[]): Promise<ChatRoom | null> {
    const rooms = await this.roomRepo.find({ where: { isGroup: false, isActive: true } });
    const sorted = [...participantIds].sort().join(',');
    return rooms.find(r => [...(r.participantIds || [])].sort().join(',') === sorted) || null;
  }

  async getAllRooms(filters?: { isGroup?: boolean }): Promise<ChatRoom[]> {
    const where: any = { isActive: true };
    if (filters?.isGroup !== undefined) where.isGroup = filters.isGroup;
    return this.roomRepo.find({ where, order: { lastActivity: 'DESC' } });
  }

  async deleteRoom(roomId: string): Promise<void> {
    await this.roomRepo.update(roomId, { isActive: false });
  }

  async markRoomRead(roomId: string, userId: string): Promise<void> {
    await this.msgRepo.update(
      { roomId, isRead: false },
      { isRead: true },
    );
  }

  async getUnreadCount(room: ChatRoom, userId: string): Promise<number> {
    return this.msgRepo.count({
      where: { roomId: room.id, isRead: false, isDeleted: false },
    });
  }

  // ── Message CRUD ──

  async sendMessage(data: {
    roomId: string; senderId: string; senderName: string; senderRole?: string;
    text: string; fileUrl?: string; fileName?: string; fileType?: string; fileSize?: number;
  }): Promise<ChatMessage> {
    const room = await this.getRoom(data.roomId);

    const msg = new ChatMessage();
    msg.roomId = data.roomId;
    msg.senderId = data.senderId;
    msg.senderName = data.senderName;
    msg.senderRole = data.senderRole || 'user';
    msg.text = data.text;
    if (data.fileUrl) msg.fileUrl = data.fileUrl;
    if (data.fileName) msg.fileName = data.fileName;
    if (data.fileType) msg.fileType = data.fileType;
    if (data.fileSize) msg.fileSize = data.fileSize;

    const saved = await this.msgRepo.save(msg);

    // Update room metadata
    await this.roomRepo.update(data.roomId, {
      lastMessage: data.text?.slice(0, 200) || '[Dosya]',
      lastActivity: new Date(),
      messageCount: () => 'messageCount + 1',
    });

    return saved;
  }

  async getMessages(roomId: string, options?: { limit?: number; before?: string }): Promise<ChatMessage[]> {
    const where: any = { roomId, isDeleted: false };
    if (options?.before) {
      where.createdAt = LessThan(new Date(options.before));
    }
    const msgs = await this.msgRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: options?.limit || 100,
    });
    return msgs.reverse();
  }

  async markMessageRead(messageId: string, userId: string): Promise<void> {
    const msg = await this.msgRepo.findOne({ where: { id: messageId } });
    if (msg && !msg.readBy?.includes(userId)) {
      const readBy = [...(msg.readBy || []), userId];
      await this.msgRepo.update(messageId, { isRead: readBy.length > 0, readBy });
    }
  }

  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const msg = await this.msgRepo.findOne({ where: { id: messageId } });
    if (!msg) throw new NotFoundException('Mesaj bulunamadı');
    if (msg.senderId !== userId) return; // Only sender can delete
    await this.msgRepo.update(messageId, { isDeleted: true });
  }

  // ── File attachments ──

  async sendFileMessage(data: {
    roomId: string; senderId: string; senderName: string; senderRole?: string;
    fileUrl: string; fileName: string; fileType: string; fileSize: number;
  }): Promise<ChatMessage> {
    return this.sendMessage({
      roomId: data.roomId,
      senderId: data.senderId,
      senderName: data.senderName,
      senderRole: data.senderRole,
      text: `📎 ${data.fileName}`,
      fileUrl: data.fileUrl,
      fileName: data.fileName,
      fileType: data.fileType,
      fileSize: data.fileSize,
    });
  }

  // ── Room unread counts ──

  async getUnreadCounts(userId: string): Promise<Record<string, number>> {
    const rooms = await this.getUserRooms(userId);
    const counts: Record<string, number> = {};

    for (const room of rooms) {
      const count = await this.msgRepo.count({
        where: { roomId: room.id, isRead: false, isDeleted: false },
      });
      if (count > 0) counts[room.id] = count;
    }

    return counts;
  }

  // ── Search ──

  async searchMessages(query: string, roomId?: string): Promise<ChatMessage[]> {
    const qb = this.msgRepo.createQueryBuilder('m')
      .where('m.isDeleted = :del', { del: false })
      .andWhere('m.text ILIKE :q', { q: `%${query}%` })
      .orderBy('m.createdAt', 'DESC')
      .take(50);

    if (roomId) qb.andWhere('m.roomId = :roomId', { roomId });

    return qb.getMany();
  }
}
