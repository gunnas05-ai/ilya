import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('wallets')
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @OneToOne(() => User, (user) => user.wallet)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('float', { default: 0 })
  availableBalance: number;

  @Column('float', { default: 0 })
  escrowBalance: number;

  @Column('float', { default: 0 })
  pendingRelease: number;

  @Column({ nullable: true })
  iban: string;

  @Column({ nullable: true })
  bankName: string;

  @Column({ nullable: true })
  accountHolderName: string;

  @Column('float', { default: 0 })
  cashbackBalance: number;

  @Column('int', { default: 0 })
  creditBalance: number; // Kontör bakiyesi (birleşik cüzdan)

  @Column('float', { default: 0 })
  totalEarned: number;  // Toplam kazanç

  @Column('float', { default: 0 })
  totalSpent: number;   // Toplam harcama

  @Column('float', { default: 50000 })
  dailyWithdrawalLimit: number;

  @Column('float', { default: 500000 })
  monthlyWithdrawalLimit: number;

  @Column('float', { default: 0 })
  dailyWithdrawnToday: number;

  @Column({ type: 'timestamp', nullable: true })
  lastWithdrawalDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

export enum TransactionType {
  CREDIT = 'credit',
  DEBIT = 'debit',
  ESCROW_LOCK = 'escrow_lock',
  ESCROW_RELEASE = 'escrow_release',
  WITHDRAWAL = 'withdrawal',
  COMMISSION = 'commission',
  REFUND = 'refund',
  IBAN_TRANSFER = 'iban_transfer',
  FUEL_ADVANCE = 'fuel_advance',
  MILESTONE_PAYOUT = 'milestone_payout',
  CASHBACK = 'cashback',
}

@Entity('wallet_transactions')
export class WalletTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  walletId: string;

  @Column({ type: 'simple-enum', enum: TransactionType })
  type: TransactionType;

  @Column('float')
  amount: number;

  @Column('float', { default: 0 })
  balanceBefore: number;

  @Column('float', { default: 0 })
  balanceAfter: number;

  @Column({ nullable: true })
  referenceId: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({ nullable: true })
  @Index({ unique: true })
  idempotencyKey: string;

  @Column({ nullable: true })
  hmacSignature: string;

  @CreateDateColumn()
  createdAt: Date;
}
