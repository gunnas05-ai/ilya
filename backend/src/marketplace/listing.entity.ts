import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, OneToMany, OneToOne } from 'typeorm';

export enum ListingStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  RESERVED = 'RESERVED',
  SOLD = 'SOLD',
  SUSPENDED = 'SUSPENDED',
  DELETED = 'DELETED',
}

@Entity('marketplace_listings')
export class Listing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  title: string;

  @Column()
  categoryId: number;

  @Column()
  @Index()
  sellerId: string;

  @Column('decimal', { precision: 15, scale: 2 })
  price: number;

  @Column({ length: 3, default: 'TRY' })
  currency: string;

  @Column('text')
  description: string;

  @Column({ length: 300 })
  fullAddress: string;

  @Column({ length: 50 })
  city: string;

  @Column({ length: 50 })
  district: string;

  @Column('float', { nullable: true })
  latitude: number;

  @Column('float', { nullable: true })
  longitude: number;

  @Column({ default: true })
  isEscrowSupported: boolean;

  @Column({ default: true })
  isNegotiable: boolean;

  @Column({ default: false })
  isBarterAvailable: boolean;

  @Column({ default: 1 })
  stockCount: number;

  @Column({ default: 0 })
  viewCount: number;

  @Column('decimal', { precision: 3, scale: 2, default: 0 })
  aiRiskScore: number;

  @Column({ type: 'simple-enum', enum: ListingStatus, default: ListingStatus.ACTIVE })
  status: ListingStatus;

  @Column({ nullable: true })
  coverImageUrl: string;

  @Column('simple-array', { nullable: true })
  imageUrls: string[];

  @Column('simple-json', { nullable: true })
  attributes: Record<string, string>; // EAV fallback

  @Column({ default: false })
  isDeleted: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
