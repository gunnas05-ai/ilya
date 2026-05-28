import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Vehicle } from './vehicle.entity';
import { User } from '../users/user.entity';

export enum SaleType {
  FIXED = 'fixed',
  AUCTION = 'auction',
}

export enum ListingStatus {
  ACTIVE = 'active',
  SOLD = 'sold',
  ENDED_UNSOLD = 'ended_unsold',
  CANCELLED = 'cancelled',
}

@Entity('vehicle_listings')
export class VehicleListing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  vehicleId: string;

  @ManyToOne(() => Vehicle)
  @JoinColumn({ name: 'vehicleId' })
  vehicle: Vehicle;

  @Column()
  sellerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'sellerId' })
  seller: User;

  @Column({ type: 'simple-enum', enum: SaleType })
  saleType: SaleType;

  @Column('decimal', { precision: 14, scale: 2, nullable: true })
  price: number;

  @Column('decimal', { precision: 14, scale: 2, nullable: true })
  startingBid: number;

  @Column('decimal', { precision: 14, scale: 2, nullable: true })
  reservePrice: number;

  @Column('decimal', { precision: 14, scale: 2, nullable: true })
  buyNowPrice: number;

  @Column('decimal', { precision: 14, scale: 2, default: 1000 })
  bidIncrement: number;

  @Column({ nullable: true })
  auctionStart: Date;

  @Column({ nullable: true })
  auctionEnd: Date;

  @Column({ type: 'simple-enum', enum: ListingStatus, default: ListingStatus.ACTIVE })
  status: ListingStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => VehicleBid, (b) => b.listing, { cascade: true })
  bids: VehicleBid[];
}

@Entity('vehicle_bids')
export class VehicleBid {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  listingId: string;

  @ManyToOne(() => VehicleListing, (l) => l.bids, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listingId' })
  listing: VehicleListing;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  bidder: User;

  @Column('decimal', { precision: 14, scale: 2 })
  amount: number;

  @CreateDateColumn()
  createdAt: Date;
}
