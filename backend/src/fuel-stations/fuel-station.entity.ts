import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, OneToMany } from 'typeorm';
import { FuelPrice } from './fuel-price.entity';
import { StationImage } from './station-image.entity';
import { StationReview } from './station-review.entity';
import { StationService } from './station-service.entity';

export enum WorkingStatus {
  ACTIVE = 'active',
  CLOSED = 'closed',
  TEMPORARILY_CLOSED = 'temporarily_closed',
}

@Entity('fuel_stations')
@Index(['city', 'district'])
@Index(['brand'])
@Index(['isDeleted', 'workingStatus'])
export class FuelStation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  brand: string;

  @Column({ nullable: true })
  brandLogo: string;

  @Column({ nullable: true })
  brandColor: string;

  @Column()
  city: string;

  @Column()
  district: string;

  @Column('text')
  fullAddress: string;

  @Column('float', { nullable: true })
  latitude: number;

  @Column('float', { nullable: true })
  longitude: number;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  website: string;

  @Column({ nullable: true })
  taxNumber: string;

  @Column({ type: 'simple-enum', enum: WorkingStatus, default: WorkingStatus.ACTIVE })
  workingStatus: WorkingStatus;

  @Column({ default: false })
  is247: boolean;

  @Column({ default: false })
  nightShift: boolean;

  @Column('simple-json', { nullable: true })
  workingHours: { day: string; open: string; close: string }[];

  @Column({ nullable: true })
  timezone: string;

  @Column('simple-json', { nullable: true })
  holidayOverrides: { date: string; open: string; close: string; closed: boolean }[];

  @OneToMany(() => FuelPrice, (p) => p.station)
  prices: FuelPrice[];

  @OneToMany(() => StationImage, (i) => i.station)
  images: StationImage[];

  @OneToMany(() => StationReview, (r) => r.station)
  reviews: StationReview[];

  @OneToMany(() => StationService, (s) => s.station)
  services: StationService[];

  @Column('float', { default: 0 })
  averageRating: number;

  @Column('int', { default: 0 })
  reviewCount: number;

  @Column()
  createdById: string;

  @Column({ default: false })
  isDeleted: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
