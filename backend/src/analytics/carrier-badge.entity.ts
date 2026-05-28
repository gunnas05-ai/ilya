import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum BadgeType {
  GOLD = 'gold',
  SILVER = 'silver',
  BRONZE = 'bronze',
  SPEED = 'speed',
  RELIABLE = 'reliable',
  VOLUME = 'volume',
}

@Entity('carrier_badges')
@Index(['carrierId'])
export class CarrierBadge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  carrierId: string;

  @Column({ type: 'simple-enum', enum: BadgeType })
  type: BadgeType;

  @Column()
  name: string; // "Altın Taşıyıcı", "Hızlı Teslimatçı", "Güvenilir Şoför"

  @Column()
  icon: string; // 🥇🥈🥉⚡🛡️📦

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'timestamp', default: () => 'NOW()' })
  earnedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
