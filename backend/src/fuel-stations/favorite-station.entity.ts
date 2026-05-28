import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { FuelStation } from './fuel-station.entity';

@Entity('favorite_stations')
export class FavoriteStation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  stationId: string;

  @ManyToOne(() => FuelStation)
  @JoinColumn({ name: 'stationId' })
  station: FuelStation;

  @Column({ nullable: true })
  note: string;

  @CreateDateColumn()
  createdAt: Date;
}
