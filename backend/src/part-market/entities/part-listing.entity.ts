import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/user.entity';

export enum PartCondition { NEW = 'new', LIKE_NEW = 'like_new', USED = 'used', REFURBISHED = 'refurbished', FOR_PARTS = 'for_parts' }
export enum PriceType { FIXED = 'fixed', NEGOTIABLE = 'negotiable', AUCTION = 'auction' }
export enum ListingStatus { ACTIVE = 'active', SOLD = 'sold', RESERVED = 'reserved', REMOVED = 'removed', FLAGGED = 'flagged' }

@Entity('part_listings')
@Index(['categoryId', 'status'])
@Index(['city', 'status'])
@Index(['price'])
export class PartListing {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ type: 'uuid' }) @Index() sellerId: string;
  @ManyToOne(() => User) @JoinColumn({ name: 'sellerId' }) seller: User;

  @Column({ length: 150 }) title: string;
  @Column({ type: 'text', nullable: true }) description: string;

  @Column({ type: 'uuid', nullable: true }) categoryId: string;
  @Column({ type: 'uuid', nullable: true }) subcategoryId: string;

  @Column({ length: 100, nullable: true }) brand: string;
  @Column({ length: 100, nullable: true }) model: string;
  @Column({ length: 50, nullable: true }) partNumber: string;

  @Column({ type: 'simple-array', nullable: true }) oemNumbers: string[];
  @Column({ type: 'jsonb', nullable: true }) compatibleVehicles: any[];

  @Column({ length: 20, default: 'used' }) condition: string;
  @Column({ type: 'int', nullable: true }) mileage: number;
  @Column({ default: false }) warranty: boolean;
  @Column({ type: 'int', nullable: true }) warrantyMonths: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 }) price: number;
  @Column({ length: 20, default: 'fixed' }) priceType: string;
  @Column({ default: true }) acceptOffer: boolean;
  @Column({ default: false }) tradePossible: boolean;

  @Column({ default: false }) shippingAvailable: boolean;
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true }) shippingPrice: number;
  @Column({ default: true }) localPickup: boolean;
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true }) latitude: number;
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true }) longitude: number;
  @Column({ length: 100, nullable: true }) city: string;
  @Column({ length: 100, nullable: true }) district: string;

  @Column({ length: 20, default: 'active' }) status: string;
  @Column({ default: 0 }) viewCount: number;
  @Column({ default: 0 }) favoriteCount: number;
  @Column({ default: false }) isBoosted: boolean;
  @Column({ type: 'timestamp', nullable: true }) boostExpiresAt: Date;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
