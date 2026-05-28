import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Load } from '../loads/load.entity';

export enum IncomeType {
  MAAS = 'maas',
  KIRA = 'kira',
  TICARI_KAZANC = 'ticari_kazanc',
  YATIRIM = 'yatirim',
  YARDIM = 'yardim',
  TASIMA_KAZANCI = 'tasima_kazanci',
  DIGER = 'diger',
}

export enum IncomeSource {
  MANUAL = 'manual',
  AUTO = 'auto',
}

@Entity('incomes')
export class Income {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  vehicleId: string;

  @Column({ nullable: true })
  driverId: string;

  @Column({ nullable: true })
  loadId: string;

  @ManyToOne(() => Load, { nullable: true })
  @JoinColumn({ name: 'loadId' })
  load: Load;

  @Column({ type: 'simple-enum', enum: IncomeType })
  type: IncomeType;

  @Column('decimal', { precision: 12, scale: 2 })
  amount: number;

  @Column({ length: 3, default: 'TRY' })
  currency: string;

  @Column('timestamp')
  date: Date;

  @Column({ length: 50, nullable: true })
  paymentMethod: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({ type: 'simple-enum', enum: IncomeSource, default: IncomeSource.MANUAL })
  source: IncomeSource;

  @Column({ default: false })
  isDeleted: boolean;

  @Column({ type: 'uuid', nullable: true })
  createdBy: string;

  @Column({ type: 'uuid', nullable: true })
  updatedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
