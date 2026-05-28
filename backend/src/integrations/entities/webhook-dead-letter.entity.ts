import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('webhook_dead_letters')
export class WebhookDeadLetter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  webhookId: string;

  @Column({ length: 100 })
  eventType: string;

  @Column({ type: 'jsonb' })
  payload: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  lastError: string;

  @Column({ default: 5 })
  retryCount: number;

  @Column({ default: 'pending' })
  status: string; // pending, replaying, resolved, discarded

  @CreateDateColumn()
  failedAt: Date;
}
