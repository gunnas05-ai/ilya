import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from '../users/user.entity';

export enum VehicleStatus {
  ACTIVE = 'active',
  SOLD = 'sold',
  DRAFTED = 'drafted',
}

export enum FuelType {
  BENZIN = 'benzin',
  DIZEL = 'dizel',
  LPG = 'lpg',
  ELEKTRIK = 'elektrik',
  HIBRIT = 'hibrit',
}

export enum TransmissionType {
  MANUEL = 'manuel',
  OTOMATIK = 'otomatik',
  YARI_OTOMATIK = 'yari_otomatik',
}

@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  owner: User;

  @Column()
  brand: string;

  @Column()
  model: string;

  @Column('int')
  year: number;

  @Column('int')
  mileage: number;

  @Column({ type: 'simple-enum', enum: FuelType })
  fuelType: FuelType;

  @Column({ type: 'simple-enum', enum: TransmissionType })
  transmission: TransmissionType;

  @Column()
  color: string;

  @Column()
  plate: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({ default: false })
  hasAccident: boolean;

  @Column('text', { nullable: true })
  accidentDetail: string;

  @Column({ default: false })
  hasServiceRecord: boolean;

  @Column('text', { nullable: true })
  serviceDetail: string;

  @Column({ type: 'simple-enum', enum: VehicleStatus, default: VehicleStatus.DRAFTED })
  status: VehicleStatus;

  @Column({ nullable: true })
  categoryId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => VehiclePhoto, (p) => p.vehicle, { cascade: true })
  photos: VehiclePhoto[];
}

@Entity('vehicle_photos')
export class VehiclePhoto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  vehicleId: string;

  @ManyToOne(() => Vehicle, (v) => v.photos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicleId' })
  vehicle: Vehicle;

  @Column()
  url: string;

  @Column('int', { default: 0 })
  sortOrder: number;
}
