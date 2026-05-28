import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum OutboxStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('outbox_events')
export class OutboxEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  eventType: string;

  @Column('simple-json')
  payload: any;

  @Column({ type: 'simple-enum', enum: OutboxStatus, default: OutboxStatus.PENDING })
  @Index()
  status: OutboxStatus;

  @Column({ default: 0 })
  retryCount: number;

  @Column({ default: 5 })
  maxRetries: number;

  @Column('text', { nullable: true })
  lastError: string;

  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
