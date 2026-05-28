import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum AnalyticsPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

@Entity('carrier_analytics')
export class CarrierAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  carrierId: string;

  @Column('float', { default: 0 })
  totalEmptyKm: number;

  @Column('float', { default: 0 })
  totalLoadedKm: number;

  @Column('float', { default: 0 })
  returnLoadRatio: number; // 0-1, loaded/(empty+loaded)

  @Column('float', { default: 0 })
  avgFillRate: number; // percentage 0-100

  @Column('int', { default: 0 })
  successfulReturnLoads: number;

  @Column('int', { default: 0 })
  totalTrips: number;

  @Column('float', { default: 0 })
  estimatedFuelSaving: number; // TL

  @Column('float', { default: 0 })
  estimatedExtraRevenue: number; // TL

  @Column('float', { default: 0 })
  efficiencyScore: number; // 0-100

  @Column({ type: 'simple-enum', enum: AnalyticsPeriod, default: AnalyticsPeriod.MONTHLY })
  period: AnalyticsPeriod;

  @Column({ type: 'date' })
  periodStart: string;

  @Column({ type: 'date' })
  periodEnd: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
