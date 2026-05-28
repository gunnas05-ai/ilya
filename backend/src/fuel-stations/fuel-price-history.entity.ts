import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('fuel_price_history')
@Index(['stationId', 'fuelType', 'createdAt'])
export class FuelPriceHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  stationId: string;

  @Column()
  fuelType: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column({ nullable: true })
  updatedById: string;

  @Column({ length: 7, nullable: true })
  period: string; // Partition key: YYYY-MM format (e.g. '2026-05')

  @CreateDateColumn()
  createdAt: Date;
}
