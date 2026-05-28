import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('carrier_preferences')
@Index(['carrierId'], { unique: true })
export class CarrierPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  carrierId: string;

  // En çok tercih edilen rotalar (JSON: [{from, to, count, lastUsed}])
  @Column('simple-json', { default: '[]' })
  favoriteRoutes: Array<{ fromCity: string; toCity: string; count: number; lastUsed: string }>;

  // Tercih edilen yük tipleri (JSON: [{type, count}])
  @Column('simple-json', { default: '[]' })
  preferredLoadTypes: Array<{ loadType: string; count: number }>;

  // Tercih edilen fiyat aralığı
  @Column('float', { default: 0 })
  avgAcceptedPrice: number;

  @Column('float', { default: 0 })
  minAcceptedPrice: number;

  @Column('float', { default: 0 })
  maxAcceptedPrice: number;

  // Tercih edilen mesafe aralığı
  @Column('float', { default: 0 })
  avgPreferredDistance: number;

  // Tercih edilen araç tipi
  @Column({ nullable: true })
  preferredVehicleType: string;

  // Aktif olduğu gün ve saat dilimleri (JSON: [{dayOfWeek, hourStart, hourEnd}])
  @Column('simple-json', { default: '[]' })
  activeTimeSlots: Array<{ dayOfWeek: number; hourStart: number; hourEnd: number }>;

  // Toplam etkileşim sayısı
  @Column('int', { default: 0 })
  totalInteractions: number;

  // Toplam kabul edilen yük
  @Column('int', { default: 0 })
  totalAccepted: number;

  // Toplam reddedilen yük
  @Column('int', { default: 0 })
  totalRejected: number;

  // Son aktivite zamanı
  @Column({ type: 'timestamp', nullable: true })
  lastActivityAt: Date;

  // Embedding vektörü (JSON: number[]) - taşıyıcının matematiksel temsili
  @Column('simple-json', { default: '[]' })
  embedding: number[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
