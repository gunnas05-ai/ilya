import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum FuelCardProvider {
  PETROL_OFISI = 'petrol_ofisi',
  SHELL = 'shell',
  OPET = 'opet',
  MOCK = 'mock',
}

@Entity('fuel_cards')
export class FuelCard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @Column({ length: 20, unique: true })
  cardNo: string;

  @Column({ type: 'simple-enum', enum: FuelCardProvider })
  provider: FuelCardProvider;

  @Column({ length: 50 })
  holderName: string;

  @Column({ default: true })
  isActive: boolean;

  @Column('float', { default: 0 })
  monthlyLimit: number;

  @Column('float', { default: 0 })
  currentMonthSpent: number;

  @Column({ nullable: true })
  vehiclePlate: string;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('fuel_card_transactions')
export class FuelCardTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  cardId: string;

  @Column()
  @Index()
  userId: string;

  @Column('float')
  amount: number;

  @Column('float')
  liters: number;

  @Column('float')
  pricePerLiter: number;

  @Column({ length: 20 })
  fuelType: string;

  @Column({ length: 100 })
  stationName: string;

  @Column({ length: 50, nullable: true })
  stationCity: string;

  @Column('timestamp')
  transactionDate: Date;

  @Column({ nullable: true, length: 60 })
  providerTransactionId: string;

  @Column({ default: false })
  syncedToFinance: boolean;

  @Column({ nullable: true })
  expenseId: string;

  @CreateDateColumn()
  createdAt: Date;
}
