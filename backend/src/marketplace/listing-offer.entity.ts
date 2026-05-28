import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum OfferStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  COUNTERED = 'COUNTERED',
  EXPIRED = 'EXPIRED',
}

@Entity('marketplace_offers')
export class ListingOffer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  listingId: string;

  @Column()
  @Index()
  buyerId: string;

  @Column('decimal', { precision: 15, scale: 2 })
  offerAmount: number;

  @Column({ length: 500, nullable: true })
  message: string;

  @Column({ default: false })
  isBarterOffer: boolean;

  @Column('simple-json', { nullable: true })
  barterItems: { description: string; estimatedValue: number }[];

  @Column({ type: 'simple-enum', enum: OfferStatus, default: OfferStatus.PENDING })
  status: OfferStatus;

  // Counter offer
  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  counterAmount: number;

  @Column({ length: 500, nullable: true })
  counterMessage: string;

  @Column({ nullable: true })
  counteredAt: Date;

  @Column({ nullable: true })
  acceptedAt: Date;

  @Column({ nullable: true })
  expiredAt: Date;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
