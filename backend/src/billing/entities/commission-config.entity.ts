import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('commission_configs')
export class CommissionConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50, unique: true })
  name: string; // 'platform_match', 'own_carrier', 'escrow_acceleration', 'insurance', 'fuel_card', 'early_payment'

  @Column({ length: 100 })
  displayName: string; // 'Platform Eşleşme', 'Kendi Taşıyıcısı'

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  rate: number; // 2.00 = %2

  @Column({ length: 200, nullable: true })
  description: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
