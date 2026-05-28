import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('epdk_fuel_prices')
export class EpdkFuelPrice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  motorin: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  benzin: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  lpg: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  adblue: number;

  @Column({ default: 'epdk_scraper' })
  source: string;

  @CreateDateColumn()
  createdAt: Date;
}
