import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

@Entity('user_subscriptions')
@Index(['userId', 'status'])
export class UserSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @Column({ type: 'uuid' })
  planId: string;

  @Column({ length: 20, default: 'active' })
  status: string; // 'active', 'grace_period', 'expired', 'cancelled'

  @Column({ type: 'timestamp' })
  startedAt: Date;

  @Column({ type: 'timestamp' })
  currentPeriodStart: Date;

  @Column({ type: 'timestamp' })
  currentPeriodEnd: Date;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt: Date;

  @Column({ type: 'uuid', nullable: true })
  paymentMethodId: string;

  @Column({ default: true })
  autoRenew: boolean;

  @Column({ default: 0 })
  renewalFailCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastRenewalAttempt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
