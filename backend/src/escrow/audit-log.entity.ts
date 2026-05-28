import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum AuditAction {
  ESCROW_CREATED = 'escrow_created',
  ESCROW_FUNDS_LOCKED = 'escrow_funds_locked',
  ESCROW_FUNDS_RELEASED = 'escrow_funds_released',
  ESCROW_CANCELLED = 'escrow_cancelled',
  QR_SCANNED = 'qr_scanned',
  QR_SCAN_FAILED = 'qr_scan_failed',
  FRAUD_ALERT_TRIGGERED = 'fraud_alert_triggered',
  PAYMENT_ON_HOLD = 'payment_on_hold',
  DISPUTE_OPENED = 'dispute_opened',
  DISPUTE_RESOLVED = 'dispute_resolved',
  WALLET_CREDITED = 'wallet_credited',
  WALLET_DEBITED = 'wallet_debited',
  WITHDRAWAL_REQUESTED = 'withdrawal_requested',
  WITHDRAWAL_APPROVED = 'withdrawal_approved',
  WITHDRAWAL_COMPLETED = 'withdrawal_completed',
  WITHDRAWAL_REJECTED = 'withdrawal_rejected',
  MILESTONE_COMPLETED = 'milestone_completed',
}

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'simple-enum', enum: AuditAction })
  action: AuditAction;

  @Column()
  userId: string;

  @Column({ nullable: true })
  targetId: string;

  @Column({ nullable: true })
  targetType: string;

  @Column('simple-json', { nullable: true })
  metadata: any;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @CreateDateColumn()
  createdAt: Date;
}
