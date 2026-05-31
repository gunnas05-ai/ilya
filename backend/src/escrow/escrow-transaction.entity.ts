import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Load } from '../loads/load.entity';

export enum EscrowStatus {
  BEKLEMEDE = 'beklemede',
  BLOKEDE = 'blokede',
  TESLIMAT_BEKLENIYOR = 'teslimat_bekleniyor',
  ONAYLANDI = 'onaylandi',
  SERBEST_BIRAKILDI = 'serbest_birakildi',
  IPTAL_EDILDI = 'iptal_edildi',
  ITIRAZ_SURECINDE = 'itiraz_surecinde',
}

@Entity('escrow_transactions')
export class EscrowTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  loadId: string;

  @ManyToOne(() => Load)
  @JoinColumn({ name: 'loadId' })
  load: Load;

  @Index()
  @Column()
  shipperId: string;

  @Index()
  @Column()
  carrierId: string;

  @Column('float')
  amount: number;

  @Column('float', { default: 0 })
  releasedAmount: number;

  @Column({ type: 'simple-enum', enum: EscrowStatus, default: EscrowStatus.BEKLEMEDE })
  status: EscrowStatus;

  @Column({ unique: true, nullable: true })
  idempotencyKey: string;

  // Milestone support
  @Column({ default: false })
  isMilestone: boolean;

  @Column('int', { default: 1 })
  totalMilestones: number;

  @Column('int', { default: 0 })
  completedMilestones: number;

  @Column('simple-json', { nullable: true })
  milestonePercentages: number[];

  @Column('float', { default: 0 })
  milestoneReleasedAmount: number;

  @Column('int', { nullable: true })
  milestoneTimeoutHours: number;

  // Fraud data
  @Column('int', { default: 0 })
  fraudScore: number;

  @Column('simple-json', { nullable: true })
  fraudDetails: any;

  @Column({ nullable: true })
  riskTier: string; // 'low', 'medium', 'high'

  @Column('float', { default: 0 })
  routeAlignmentScore: number;

  @Column({ default: false })
  manualReviewRequired: boolean;

  @Column({ nullable: true })
  reviewedByUserId: string;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date;

  @Column('simple-json', { nullable: true })
  verificationData: any;

  // Dispute
  @Column({ nullable: true })
  disputeReason: string;

  @Column('simple-json', { nullable: true })
  disputeEvidence: any;

  @Column({ type: 'timestamp', nullable: true })
  disputeOpenedAt: Date;

  @Column({ nullable: true })
  disputeResolvedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  disputeResolvedAt: Date;

  @Column({ nullable: true })
  disputeResolution: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
