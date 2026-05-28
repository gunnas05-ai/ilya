import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { FuelStation } from './fuel-station.entity';

@Entity('station_reviews')
export class StationReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  stationId: string;

  @ManyToOne(() => FuelStation, (s) => s.reviews)
  @JoinColumn({ name: 'stationId' })
  station: FuelStation;

  @Column()
  userId: string;

  @Column('int')
  rating: number;

  @Column('text')
  comment: string;

  @Column({ default: false })
  isDeleted: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
