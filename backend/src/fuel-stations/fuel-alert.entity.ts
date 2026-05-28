import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum AlertStatus {
  ACTIVE = 'active',
  TRIGGERED = 'triggered',
  DISABLED = 'disabled',
}

export enum AlertType {
  PRICE_THRESHOLD = 'price_threshold',
  BRAND_DISCOUNT = 'brand_discount',
  NEW_PRICE_UPDATE = 'new_price_update',
  PRICE_DROP = 'price_drop',
}

@Entity('fuel_alerts')
export class FuelAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'simple-enum', enum: AlertType, default: AlertType.PRICE_THRESHOLD })
  alertType: AlertType;

  @Column({ nullable: true })
  fuelType: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  priceThreshold: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  priceDropPercent: number;

  @Column({ nullable: true })
  brand: string;

  @Column({ nullable: true })
  region: string;

  @Column({ type: 'simple-enum', enum: AlertStatus, default: AlertStatus.ACTIVE })
  status: AlertStatus;

  @Column({ default: false })
  isMuted: boolean;

  @Column({ nullable: true })
  muteUntil: Date;

  @Column('int', { default: 0 })
  repeatFrequency: number; // minutes, 0 = once

  @Column('int', { default: 0 })
  timesTriggered: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
