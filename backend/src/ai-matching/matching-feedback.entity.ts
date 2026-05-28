import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum FeedbackAction {
  VIEWED = 'viewed',
  BID = 'bid',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  SKIPPED = 'skipped',
}

@Entity('matching_feedback')
@Index(['carrierId', 'createdAt'])
@Index(['loadId'])
export class MatchingFeedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  carrierId: string;

  @Column({ type: 'uuid' })
  loadId: string;

  @Column({ type: 'simple-enum', enum: FeedbackAction })
  action: FeedbackAction;

  // Yükün özellikleri (denormalize - hızlı erişim için)
  @Column()
  loadTitle: string;

  @Column()
  fromCity: string;

  @Column()
  toCity: string;

  @Column({ nullable: true })
  loadType: string;

  @Column('float', { default: 0 })
  loadPrice: number;

  @Column('float', { default: 0 })
  loadDistance: number;

  @Column({ nullable: true })
  vehicleType: string;

  // Önerinin hangi skorla yapıldığı
  @Column('float', { default: 0 })
  matchScore: number;

  // Öneri kaynağı (recommended/search/manual)
  @Column({ default: 'manual' })
  source: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
