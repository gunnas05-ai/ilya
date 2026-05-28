import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { FuelStation } from './fuel-station.entity';

export enum ImageType {
  GENEL_GORUNUM = 'genel_gorunum',
  POMPA_ALANI = 'pompa_alani',
  MARKET_LOKANTA = 'market_lokanta',
  ELEKTRIKLI_SARJ = 'elektrikli_sarj',
}

@Entity('station_images')
export class StationImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  stationId: string;

  @ManyToOne(() => FuelStation, (s) => s.images)
  @JoinColumn({ name: 'stationId' })
  station: FuelStation;

  @Column({ type: 'simple-enum', enum: ImageType })
  imageType: ImageType;

  @Column()
  url: string;

  @Column({ default: false })
  isDeleted: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
