import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum BookingStatus {
  AVAILABLE = 'available',       // Hemen alınabilir
  LOCKED = 'locked',             // Geçici rezerve (5 dk)
  BOOKED = 'booked',             // Kesin rezerve edildi
  EXPIRED = 'expired',           // Kilit süresi doldu
  CANCELLED = 'cancelled',       // İptal edildi
}

@Entity('instant_bookings')
@Index(['loadId'], { unique: true })
@Index(['carrierId'])
export class InstantBooking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  loadId: string;

  @Column('float')
  instantPrice: number; // Sabit fiyat — pazarlıksız

  @Column('float', { default: 3.5 })
  platformCommissionPct: number; // Platform komisyonu %

  // Hesaplanan değerler
  @Column('float', { default: 0 })
  platformCommission: number;

  @Column('float', { default: 0 })
  escrowFee: number;

  @Column('float', { default: 0 })
  netCarrierEarnings: number; // Taşıyıcının eline geçecek net tutar

  // FCFS Rezervasyon
  @Column({ type: 'uuid', nullable: true })
  carrierId: string;

  @Column({ type: 'varchar', nullable: true })
  carrierName: string;

  @Column({ type: 'simple-enum', enum: BookingStatus, default: BookingStatus.AVAILABLE })
  status: BookingStatus;

  @Column({ type: 'timestamp', nullable: true })
  lockedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  bookedAt: Date | null;

  @Column({ type: 'int', default: 0 })
  lockAttempts: number; // Kaç kere kilitlenmeye çalışıldı

  @Column({ type: 'int', nullable: true })
  lockTimeoutMinutes: number; // Kilit süresi (dakika)

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
