import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('webhooks')
export class Webhook {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @Column({ length: 500 })
  url: string;

  @Column({ length: 100 })
  name: string;

  @Column('simple-array')
  events: string[]; // ['load.created', 'load.status_changed', 'shipment.delivered']

  @Column({ length: 100, nullable: true })
  secret: string; // HMAC signing secret

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  successCount: number;

  @Column({ default: 0 })
  failureCount: number;

  @Column({ nullable: true })
  lastSentAt: Date;

  @Column({ nullable: true, type: 'text' })
  lastError: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
