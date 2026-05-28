import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

@Entity('rate_agreements')
@Index(['shipperId', 'fromCity', 'toCity'])
export class RateAgreement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  shipperId: string;

  @Column({ length: 100 })
  fromCity: string;

  @Column({ length: 100 })
  toCity: string;

  @Column({ length: 50, nullable: true })
  vehicleType: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  baseRate: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  discountPct: number;

  @Column({ type: 'date' })
  @Index()
  validFrom: string;

  @Column({ type: 'date' })
  validUntil: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
