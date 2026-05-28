import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/user.entity';

// ── Kategori ──
@Entity('part_categories')
export class PartCategory {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ length: 100 }) name: string;
  @Column({ length: 100, unique: true }) slug: string;
  @Column({ type: 'uuid', nullable: true }) parentId: string;
  @ManyToOne(() => PartCategory, { nullable: true }) @JoinColumn({ name: 'parentId' }) parent: PartCategory;
  @Column({ length: 10, nullable: true }) icon: string;
  @Column({ default: 0 }) sortOrder: number;
  @Column({ default: true }) isActive: boolean;
}

// ── Fotoğraf ──
@Entity('part_photos')
export class PartPhoto {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) listingId: string;
  @Column({ length: 500 }) url: string;
  @Column({ default: false }) isPrimary: boolean;
  @Column({ default: 0 }) sortOrder: number;
}

// ── Teklif ──
@Entity('part_offers')
@Index(['listingId', 'status'])
export class PartOffer {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) listingId: string;
  @Column({ type: 'uuid' }) buyerId: string;
  @ManyToOne(() => User) @JoinColumn({ name: 'buyerId' }) buyer: User;
  @Column({ type: 'decimal', precision: 12, scale: 2 }) amount: number;
  @Column({ type: 'text', nullable: true }) message: string;
  @Column({ length: 20, default: 'pending' }) status: string; // pending, accepted, rejected, countered, expired
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true }) counterAmount: number;
  @Column({ type: 'text', nullable: true }) counterMessage: string;
  @CreateDateColumn() createdAt: Date;
}

// ── Favori ──
@Entity('part_favorites')
@Index(['userId', 'listingId'], { unique: true })
export class PartFavorite {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) userId: string;
  @Column({ type: 'uuid' }) listingId: string;
  @CreateDateColumn() createdAt: Date;
}

// ── İşlem ──
@Entity('part_transactions')
@Index(['buyerId'])
@Index(['sellerId'])
export class PartTransaction {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) listingId: string;
  @Column({ type: 'uuid' }) buyerId: string;
  @Column({ type: 'uuid' }) sellerId: string;
  @Column({ type: 'decimal', precision: 12, scale: 2 }) amount: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) shippingAmount: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) platformCommission: number;
  @Column({ type: 'uuid', nullable: true }) escrowId: string;
  @Column({ length: 50, nullable: true }) shippingTrackingNo: string;
  @Column({ length: 50, nullable: true }) shippingCarrier: string;
  @Column({ type: 'jsonb', nullable: true }) shippingAddress: any;
  @Column({ length: 30, default: 'pending_payment' }) status: string;
  @Column({ type: 'timestamp', nullable: true }) buyerConfirmedAt: Date;
  @Column({ type: 'timestamp', nullable: true }) sellerPaidAt: Date;
  @CreateDateColumn() createdAt: Date;
}

// ── Değerlendirme ──
@Entity('part_reviews')
export class PartReview {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', unique: true }) transactionId: string;
  @Column({ type: 'uuid' }) reviewerId: string;
  @Column({ type: 'uuid' }) reviewedId: string;
  @Column({ type: 'int' }) rating: number; // 1-5
  @Column({ type: 'text', nullable: true }) comment: string;
  @Column({ length: 20 }) reviewType: string; // 'buyer_to_seller', 'seller_to_buyer'
  @CreateDateColumn() createdAt: Date;
}

// ── Anlaşmazlık ──
@Entity('part_disputes')
export class PartDispute {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) transactionId: string;
  @Column({ type: 'uuid' }) openedBy: string;
  @Column({ length: 50 }) reason: string;
  @Column({ type: 'text', nullable: true }) description: string;
  @Column({ type: 'jsonb', nullable: true }) evidence: any;
  @Column({ length: 20, default: 'open' }) status: string;
  @Column({ type: 'text', nullable: true }) resolution: string;
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true }) refundAmount: number;
  @Column({ type: 'uuid', nullable: true }) resolvedBy: string;
  @CreateDateColumn() createdAt: Date;
}

// ── Öne Çıkarma ──
@Entity('part_boosts')
export class PartBoost {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) listingId: string;
  @Column({ type: 'uuid' }) userId: string;
  @Column({ length: 20 }) plan: string; // 'daily', 'weekly', 'monthly'
  @Column({ type: 'decimal', precision: 10, scale: 2 }) price: number;
  @Column({ type: 'timestamp' }) startsAt: Date;
  @Column({ type: 'timestamp' }) endsAt: Date;
  @Column({ type: 'uuid', nullable: true }) paymentTxId: string;
  @Column({ default: true }) isActive: boolean;
  @CreateDateColumn() createdAt: Date;
}

// ── Komisyon ──
@Entity('part_commission_configs')
export class PartCommissionConfig {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', unique: true }) categoryId: string;
  @Column({ type: 'decimal', precision: 5, scale: 2 }) rate: number; // 5.00 = %5
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 10 }) minCommission: number;
  @Column({ default: true }) isActive: boolean;
}
