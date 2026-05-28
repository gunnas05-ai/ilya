import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum DisputeStatus {
  OPEN = 'open',
  INVESTIGATING = 'investigating',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
}

export enum DisputeReason {
  HASAR = 'hasar',
  EKSIK_TESLIM = 'eksik_teslim',
  GECIKME = 'gecikme',
  EVRAK_EKSIKLIGI = 'evrak_eksikligi',
  YANLIS_TESLIM = 'yanlis_teslim',
  DIGER = 'diger',
}

@Entity('disputes')
export class Dispute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  escrowTransactionId: string;

  @Column()
  openedByUserId: string;

  @Column({ type: 'simple-enum', enum: DisputeReason })
  reason: DisputeReason;

  @Column('text')
  description: string;

  @Column('simple-json', { nullable: true })
  evidence: any;

  @Column({ type: 'simple-enum', enum: DisputeStatus, default: DisputeStatus.OPEN })
  status: DisputeStatus;

  @Column({ nullable: true })
  resolvedByUserId: string;

  @Column('text', { nullable: true })
  resolution: string;

  @Column({ nullable: true })
  resolutionType: string; // 'release', 'partial_refund', 'full_refund'

  @Column('float', { nullable: true })
  refundAmount: number;

  @Column({ type: 'timestamp', nullable: true })
  evidenceDeadline: Date;

  @Column('int', { default: 0 })
  totalEvidenceCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
