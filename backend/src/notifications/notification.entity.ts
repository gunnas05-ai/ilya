import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum NotificationType {
  NEW_BID = 'new_bid',
  COUNTER_BID = 'counter_bid',
  BID_ACCEPTED = 'bid_accepted',
  BID_REJECTED = 'bid_rejected',
  BID_EXPIRED = 'bid_expired',
  ESCROW_LOCKED = 'escrow_locked',
  ESCROW_RELEASED = 'escrow_released',
  PAYMENT_RECEIVED = 'payment_received',
  DELIVERY_CONFIRMED = 'delivery_confirmed',
  NEW_LOAD_MATCH = 'new_load_match',
  QR_SCANNED = 'qr_scanned',
  DISPUTE_OPENED = 'dispute_opened',
  PRICE_ALERT = 'price_alert',
  SYSTEM = 'system',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @Column({ type: 'simple-enum', enum: NotificationType })
  type: NotificationType;

  @Column({ length: 200 })
  title: string;

  @Column('text')
  message: string;

  @Column('simple-json', { nullable: true })
  data: any; // Additional payload (loadId, bidId, etc.)

  @Column({ default: false })
  isRead: boolean;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date;

  @Column({ default: false })
  isPushSent: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
