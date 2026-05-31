import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('carrier_profiles')
export class CarrierProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @OneToOne(() => User, (user) => user.carrierProfile)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  licenseNumber: string;

  @Column({ nullable: true })
  plateNumber: string;

  @Column({ nullable: true })
  vehicleType: string;

  @Column({ nullable: true })
  vehicleCapacity: string;

  @Column('float', { nullable: true })
  tonnageCapacity: number;

  @Column('float', { nullable: true })
  volumeCapacity: number;

  @Column('float', { nullable: true })
  vehicleHeight: number;

  @Column('float', { nullable: true })
  vehicleWidth: number;

  @Column('float', { nullable: true })
  vehicleLength: number;

  @Column('float', { nullable: true })
  totalWeight: number;

  @Column('float', { nullable: true })
  axleWeight: number;

  @Column({ nullable: true })
  adrClass: string;

  @Column({ nullable: true })
  trailerType: string;

  @Column({ default: false })
  hasRefrigeration: boolean;

  @Column({ nullable: true })
  kBelgesi: string;

  @Column({ nullable: true })
  srcBelgesi: string;

  @Column({ nullable: true })
  srcBelgeNo: string;

  @Column({ nullable: true, type: 'date' })
  srcBelgeSonTarih: string;

  @Column({ nullable: true, type: 'date' })
  ehliyetSonTarih: string;

  @Column({ nullable: true })
  licenseType: string;

  @Column('float', { default: 0 })
  rating: number;

  @Column({ default: 0 })
  completedLoads: number;

  @Column({ nullable: true })
  tcKimlikNo: string;

  @Column({ default: false })
  isIdentityVerified: boolean;

  @Column({ default: false })
  isSrcVerified: boolean;

  @Column({ default: false })
  isKBelgesiVerified: boolean;

  @Column({ default: false })
  isPlateVerified: boolean;

  @Column({ nullable: true })
  iban: string;
}
