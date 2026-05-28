import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum BundleStatus {
  SUGGESTED = 'suggested',       // Taşıyıcıya önerildi
  VIEWED = 'viewed',             // Taşıyıcı görüntüledi
  ACCEPTED = 'accepted',         // Taşıyıcı kabul etti
  DECLINED = 'declined',         // Taşıyıcı reddetti
  EXPIRED = 'expired',           // Süresi doldu (15 dk)
  PARTIALLY_ACCEPTED = 'partial',// Paketteki bazı yükler alındı
}

@Entity('reload_bundles')
@Index(['carrierId', 'status'])
@Index(['createdAt'])
export class ReloadBundle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  carrierId: string;

  @Column()
  carrierName: string;

  // Headhaul (ana sefer) bilgisi
  @Column({ type: 'uuid' })
  headhaulShipmentId: string;

  @Column()
  headhaulTitle: string;

  @Column()
  headhaulFromCity: string;

  @Column()
  headhaulToCity: string;

  @Column('float')
  headhaulDeliveryLat: number;

  @Column('float')
  headhaulDeliveryLng: number;

  @Column({ type: 'timestamp' })
  headhaulDeliveredAt: Date;

  // Backhaul (dönüş yükü) bilgileri
  @Column('simple-json')
  backhaulLoads: Array<{
    loadId: string;
    title: string;
    fromCity: string;
    toCity: string;
    price: number;
    distance: number;
    pickupDate: string;
    vehicleType: string;
    weight: number;
    matchScore: number;
    escrowEnabled: boolean;
  }>;

  // Rota verimliliği
  @Column('float')
  totalDistance: number;        // headhaul + backhaul toplam km

  @Column('float')
  emptyKmSaved: number;         // kurtarılan boş km

  @Column('float')
  totalEarnings: number;        // toplam kazanç (headhaul + backhaul)

  @Column('float')
  emptyKmPercentage: number;    // boş km oranı (öncesi)

  @Column('float')
  optimizedEmptyKmPercentage: number; // optimize edilmiş boş km oranı

  // Durum
  @Column({ type: 'simple-enum', enum: BundleStatus, default: BundleStatus.SUGGESTED })
  status: BundleStatus;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  viewedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  acceptedAt: Date;

  @Column('simple-json', { nullable: true })
  acceptedLoadIds: string[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
