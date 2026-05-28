import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum ScoreTier {
  EXCELLENT = 'excellent',   // ≥80
  GOOD = 'good',             // ≥60
  FAIR = 'fair',             // ≥40
  AT_RISK = 'at_risk',       // <40
}

@Entity('carrier_scorecards')
export class CarrierScorecard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  carrierId: string;

  // Core metrics
  @Column('float', { default: 100 })
  onTimeDeliveryPct: number;       // 0-100

  @Column('float', { default: 0 })
  claimsRatio: number;              // 0-100 (claims/total deliveries)

  @Column('float', { default: 0 })
  cancellationRate: number;         // 0-100

  @Column('int', { default: 0 })
  avgResponseTimeMinutes: number;   // average minutes to bid/respond

  @Column('int', { default: 0 })
  totalCompletedLoads: number;

  @Column('int', { default: 0 })
  totalBidsPlaced: number;

  @Column('int', { default: 0 })
  totalBidsAccepted: number;

  @Column('int', { default: 0 })
  totalBidsRejected: number;

  @Column('int', { default: 0 })
  totalDisputes: number;

  @Column('int', { default: 0 })
  totalClaims: number;

  @Column('decimal', { precision: 19, scale: 2, default: 0 })
  totalRevenue: number;             // TL

  @Column('float', { default: 0 })
  averageRating: number;            // 0-5 yıldız

  @Column('int', { default: 0 })
  totalRatings: number;

  // Computed overall score
  @Column('float', { default: 0 })
  overallScore: number;             // 0-100

  @Column({ type: 'simple-enum', enum: ScoreTier, default: ScoreTier.GOOD })
  scoreTier: ScoreTier;

  // Restrictions
  @Column({ default: false })
  escrowRequired: boolean;          // <60 score → mandatory escrow

  @Column({ default: 0 })
  bidLimitPerDay: number;           // 0 = unlimited

  @Column({ default: false })
  isRestricted: boolean;            // <30 score → limited access

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
