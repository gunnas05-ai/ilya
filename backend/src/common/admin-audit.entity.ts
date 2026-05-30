import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('admin_audit_logs')
export class AdminAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  adminId: string;

  @Column({ length: 100 })
  adminEmail: string;

  @Column({ length: 50 })
  action: string; // 'role_change', 'user_block', 'permission_update', 'user_delete', etc.

  @Column({ length: 200 })
  description: string;

  @Column({ nullable: true, length: 100 })
  targetUserId: string;

  @Column({ nullable: true, length: 100 })
  targetUserEmail: string;

  @Column({ nullable: true, type: 'simple-json' })
  metadata: Record<string, any>; // { oldRole, newRole, permissionsChanged, etc. }

  @Column({ nullable: true, length: 45 })
  ipAddress: string;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('security_events')
export class SecurityEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ nullable: true })
  userId: string;

  @Column({ length: 50 })
  eventType: string; // 'login_failed', 'suspicious_activity', 'privilege_escalation_attempt', 'mfa_failed'

  @Column({ length: 200 })
  description: string;

  @Column({ nullable: true, length: 45 })
  ipAddress: string;

  @Column({ nullable: true, length: 200 })
  userAgent: string;

  @Column({ nullable: true, length: 50 })
  deviceFingerprint: string;

  @CreateDateColumn()
  createdAt: Date;
}
