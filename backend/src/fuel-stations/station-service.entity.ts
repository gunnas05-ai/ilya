import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { FuelStation } from './fuel-station.entity';

export enum StationServiceType {
  ARAC_YIKAMA = 'arac_yikama',
  LOKANTA = 'lokanta',
  KAFE = 'kafe',
  MARKET = 'market',
  MOTEL = 'motel',
  OTOPARK = 'otopark',
  DUS_WC = 'dus_wc',
  ELEKTRIKLI_SARJ = 'elektrikli_sarj',
  SERVIS_TAMIR = 'servis_tamir',
  LASTIKCI = 'lastikci',
  BANKA_ATM = 'banka_atm',
  UCRETSIZ_WIFI = 'ucretsiz_wifi',
  CAY_KAHVE = 'cay_kahve',
}

export enum ServiceCategory {
  TEMEL = 'temel',
  KONFOR = 'konfor',
  Arac = 'arac',
  PREMIUM = 'premium',
}

@Entity('station_services')
export class StationService {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  stationId: string;

  @ManyToOne(() => FuelStation, (s) => s.services)
  @JoinColumn({ name: 'stationId' })
  station: FuelStation;

  @Column({ type: 'simple-enum', enum: StationServiceType })
  serviceType: StationServiceType;

  @Column({ type: 'simple-enum', enum: ServiceCategory, default: ServiceCategory.TEMEL })
  category: ServiceCategory;

  @Column({ default: false })
  isPremium: boolean;

  @Column({ nullable: true })
  iconUrl: string;

  @Column({ nullable: true })
  categoryColor: string;

  @Column({ nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;
}
