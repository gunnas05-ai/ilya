import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('rate_records')
@Index(['fromCity', 'toCity'])
@Index(['createdAt'])
export class RateRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  loadId: string;

  @Column()
  fromCity: string;

  @Column()
  toCity: string;

  @Column({ nullable: true })
  vehicleType: string;

  @Column({ nullable: true })
  loadType: string;

  @Column('float')
  price: number;

  @Column('float', { default: 0 })
  distance: number;

  @Column({ nullable: true })
  carrierId: string;

  @Column({ default: 'completed' })
  transactionType: string; // completed, accepted_bid

  @Column({ type: 'int', default: 1 })
  weight: number; // ağırlık katsayısı (büyük yükler daha ağır)

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
