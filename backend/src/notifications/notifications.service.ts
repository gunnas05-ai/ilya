import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './notification.entity';

@Injectable()
export class NotificationsService {
  private wsGateway: any = null; // Lazy-injected

  constructor(
    @InjectRepository(Notification)
    private notifRepo: Repository<Notification>,
  ) {}

  /** Called by NotificationsModule to inject the gateway (avoids circular dep) */
  setWsGateway(gateway: any) {
    this.wsGateway = gateway;
  }

  async create(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: any;
  }) {
    const notif = this.notifRepo.create(data);
    const saved = await this.notifRepo.save(notif);

    // EX-011: Emit real-time notification via WebSocket
    if (this.wsGateway) {
      try {
        this.wsGateway.sendToUser(data.userId, 'NOTIFICATION', {
          id: saved.id,
          type: data.type,
          title: data.title,
          message: data.message,
          data: data.data,
          createdAt: saved.createdAt,
        });
      } catch (err) {
        // Don't block notification creation on WS failure
      }
    }

    return saved;
  }

  async getForUser(userId: string, page = 1, limit = 20) {
    const [notifications, total] = await this.notifRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { notifications, total, page, unreadCount: notifications.filter((n) => !n.isRead).length };
  }

  async markAsRead(notificationId: string, userId: string) {
    await this.notifRepo.update(
      { id: notificationId, userId },
      { isRead: true, readAt: new Date() },
    );
  }

  async markAllAsRead(userId: string) {
    await this.notifRepo.update(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
  }

  async getUnreadCount(userId: string) {
    return this.notifRepo.count({ where: { userId, isRead: false } });
  }
}
