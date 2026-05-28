import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';

export enum LoadType {
  TAM_YUK = 'tam_yuk',
  KISMI_YUK = 'kismi_yuk',
  EVDEN_EVE = 'evden_eve',
  SEHIR_ICI = 'sehir_ici',
}

export enum LoadStatus {
  BEKLEMEDE = 'beklemede',
  YOLDA = 'yolda',
  TESLIM_EDILDI = 'teslim_edildi',
  IPTAL = 'iptal',
}

export enum UrgencyLevel {
  DUSUK = 'Düşük',
  NORMAL = 'Normal',
  YUKSEK = 'Yüksek',
}

export enum CityUrgency {
  AYNI_GUN = 'Aynı Gün',
  ERTESI_GUN = 'Ertesi Gün',
  UC_GUN_ICINDE = '3 Gün İçinde',
}

@Entity('loads')
export class Load {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  title: string;

  @Column({ length: 30, nullable: true, unique: true })
  loadNo: string;

  @Column({ type: 'simple-enum', enum: LoadType })
  loadType: LoadType;

  @Column()
  fromCity: string;

  @Column()
  fromDistrict: string;

  @Column('text')
  fromAddress: string;

  @Column()
  toCity: string;

  @Column()
  toDistrict: string;

  @Column('text')
  toAddress: string;

  @Column({ length: 100 })
  contactName: string;

  @Column({ length: 20 })
  contactPhone: string;

  @Column({ type: 'date' })
  pickupDate: string;

  @Column({ nullable: true })
  pickupTime: string;

  @Column({ type: 'date' })
  deliveryDate: string;

  @Column({ nullable: true })
  deliveryTime: string;

  @Column('text', { nullable: true })
  description: string;

  // Location coordinates for PostGIS
  @Column('float', { nullable: true })
  pickupLatitude: number;

  @Column('float', { nullable: true })
  pickupLongitude: number;

  @Column('float', { nullable: true })
  deliveryLatitude: number;

  @Column('float', { nullable: true })
  deliveryLongitude: number;

  // Load type specific fields
  @Column({ nullable: true })
  vehicleType: string;

  @Column({ nullable: true })
  trailerType: string;

  @Column('float', { nullable: true })
  totalWeight: number;

  @Column({ nullable: true })
  coldChain: boolean;

  // Partial load fields
  @Column('int', { nullable: true })
  partCount: number;

  @Column('float', { nullable: true })
  totalTonnage: number;

  @Column('float', { nullable: true })
  volume: number;

  @Column({ nullable: true })
  packageType: string;

  @Column({ nullable: true })
  sharedTransport: boolean;

  @Column({ type: 'simple-enum', enum: UrgencyLevel, nullable: true })
  urgency: UrgencyLevel;

  // Home moving fields
  @Column({ nullable: true })
  homeVehicleType: string;

  @Column({ nullable: true })
  homeTrailerType: string;

  @Column({ nullable: true })
  transportType: string;

  @Column('text', { nullable: true })
  itemList: string;

  @Column('int', { nullable: true })
  senderFloor: number;

  @Column('int', { nullable: true })
  receiverFloor: number;

  @Column({ nullable: true })
  senderElevator: boolean;

  @Column({ nullable: true })
  receiverElevator: boolean;

  @Column({ nullable: true })
  packaging: boolean;

  // City delivery fields
  @Column({ nullable: true })
  cityVehicleType: string;

  @Column({ nullable: true })
  cityTrailerType: string;

  @Column({ nullable: true })
  cityTransportType: string;

  @Column('float', { nullable: true })
  estimatedDistance: number;

  @Column({ nullable: true })
  deliveryTimeSlot: string;

  @Column({ type: 'simple-enum', enum: CityUrgency, nullable: true })
  cityUrgency: CityUrgency;

  @Column({ nullable: true })
  loadSize: string;

  // Pricing
  @Column({ nullable: true })
  isAuction: boolean;

  @Column('float', { nullable: true })
  auctionMinPrice: number;

  @Column('float', { nullable: true })
  auctionMaxPrice: number;

  @Column({ type: 'timestamp', nullable: true })
  auctionStartDate: Date;

  @Column({ nullable: true })
  auctionStartTime: string;

  @Column({ type: 'timestamp', nullable: true })
  auctionEndDate: Date;

  @Column({ nullable: true })
  auctionEndTime: string;

  @Column({ nullable: true })
  cod: boolean;

  @Column({ nullable: true })
  insurance: boolean;

  @Column({ nullable: true })
  insurancePackage: string;

  @Column({ nullable: true })
  escrow: boolean; // Opsiyonel: Kullanici tercih ederse escrow devreye girer

  @Column({ nullable: true })
  pricingType: string;

  @Column('float', { nullable: true })
  pricePerTon: number;

  @Column('float', { nullable: true })
  totalKg: number;

  @Column('float', { nullable: true })
  totalPrice: number;

  // Relations
  @Column()
  creatorId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'creatorId' })
  creator: User;

  @Column({ nullable: true })
  receiverId: string;

  @Column({ type: 'simple-enum', enum: LoadStatus, default: LoadStatus.BEKLEMEDE })
  status: LoadStatus;

  @Column('int', { default: 0 })
  bidCount: number;

  @Column('float', { nullable: true })
  routeDistance: number;

  // Live Tracking ETA
  @Column({ nullable: true })
  liveETA: string;

  // Reservation system for race condition protection
  @Column({ type: 'varchar', nullable: true })
  reservedById: string | null;

  @Column({ type: 'timestamp', nullable: true })
  reservedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  reservationExpiresAt: Date | null;

  @Column('int', { default: 0 })
  version: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
