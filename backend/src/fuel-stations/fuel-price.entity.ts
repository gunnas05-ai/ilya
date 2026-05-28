import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { FuelStation } from './fuel-station.entity';

export enum FuelType {
  MOTORIN = 'motorin',
  KURSUNSUZ = 'kursunsuz',
  LPG = 'lpg',
  ADBLUE = 'adblue',
  ELEKTRIK_SARJ = 'elektrik_sarj',
}

@Entity('fuel_prices')
@Index(['stationId', 'fuelType'], { unique: true })
@Index(['fuelType', 'price'])
@Index(['updatedAt'])
export class FuelPrice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  stationId: string;

  @ManyToOne(() => FuelStation, (s) => s.prices)
  @JoinColumn({ name: 'stationId' })
  station: FuelStation;

  @Column({ type: 'simple-enum', enum: FuelType })
  fuelType: FuelType;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column({ nullable: true })
  updatedById: string;

  @Column({ length: 50, default: 'manual' })
  source: string;

  @Column({ default: true })
  isConfirmed: boolean;

  @Column('float', { default: 1.0 })
  confidenceScore: number;

  @CreateDateColumn()
  updatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
