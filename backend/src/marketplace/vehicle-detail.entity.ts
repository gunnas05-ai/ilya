import { Entity, PrimaryColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { Listing } from './listing.entity';

export enum VehicleType {
  CEKICI = 'cekici',
  DORSE = 'dorse',
  KAMYON = 'kamyon',
  TIR = 'tir',
}

@Entity('marketplace_vehicle_details')
export class VehicleDetail {
  @PrimaryColumn('uuid')
  listingId: string;

  @OneToOne(() => Listing, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listingId' })
  listing: Listing;

  @Column({ type: 'simple-enum', enum: VehicleType })
  vehicleType: VehicleType;

  // Çekici/TIR özellikleri
  @Column({ length: 17, nullable: true })
  vinCode: string;

  @Column({ length: 30, nullable: true })
  plateNumber: string;

  @Column({ nullable: true })
  modelYear: number;

  @Column({ length: 50, nullable: true })
  brand: string;

  @Column({ length: 50, nullable: true })
  model: string;

  @Column({ nullable: true })
  currentKm: number;

  // Towing uyumluluk motoru için kritik alanlar
  @Column('float', { nullable: true })
  kingPinDiameter: number; // inç (2" veya 3.5")

  @Column('float', { nullable: true })
  axleCapacityKg: number; // Dingil kapasitesi

  @Column('float', { nullable: true })
  totalWeightKg: number;

  @Column({ length: 20, nullable: true })
  adrClass: string; // '1'-'9' or empty

  // Dorse özellikleri
  @Column({ length: 30, nullable: true })
  trailerType: string; // Tenteli, Mega, Frigo, Damper, Lowbed, Tanker, Silobas...

  @Column('float', { nullable: true })
  trailerLengthCm: number;

  @Column('float', { nullable: true })
  trailerVolumeM3: number;

  @Column({ nullable: true })
  axleCount: number;

  @Column({ default: false })
  hasAbs: boolean;

  @Column({ default: false })
  hasEbs: boolean;
}
