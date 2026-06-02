import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../users/user.entity';

export class ColumnNumericTransformer {
  to(data: number): number {
    return data;
  }
  from(data: string): number {
    return parseFloat(data);
  }
}

@Entity('wallets')
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @OneToOne(() => User, (user) => user.wallet)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('decimal', { precision: 20, scale: 2, default: 0, transformer: new ColumnNumericTransformer() })
  availableBalance: number;

  @Column('decimal', { precision: 20, scale: 2, default: 0, transformer: new ColumnNumericTransformer() })
  escrowBalance: number;

  @Column('decimal', { precision: 20, scale: 2, default: 0, transformer: new ColumnNumericTransformer() })
  pendingRelease: number;

  @Column({ nullable: true })
  iban: string;

  @Column({ nullable: true })
  bankName: string;

  @Column({ nullable: true })
  accountHolderName: string;

  @Column('decimal', { precision: 20, scale: 2, default: 0, transformer: new ColumnNumericTransformer() })
  cashbackBalance: number;

  @Column('int', { default: 0 })
  creditBalance: number; // Kontör bakiyesi (birleşik cüzdan)

  @Column('decimal', { precision: 20, scale: 2, default: 0, transformer: new ColumnNumericTransformer() })
  totalEarned: number;  // Toplam kazanç

  @Column('decimal', { precision: 20, scale: 2, default: 0, transformer: new ColumnNumericTransformer() })
  totalSpent: number;   // Toplam harcama

  @Column('decimal', { precision: 20, scale: 2, default: 50000, transformer: new ColumnNumericTransformer() })
  dailyWithdrawalLimit: number;

  @Column('decimal', { precision: 20, scale: 2, default: 500000, transformer: new ColumnNumericTransformer() })
  monthlyWithdrawalLimit: number;

  @Column('decimal', { precision: 20, scale: 2, default: 0, transformer: new ColumnNumericTransformer() })
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

  @Column('decimal', { precision: 20, scale: 2, transformer: new ColumnNumericTransformer() })
  amount: number;

  @Column('decimal', { precision: 20, scale: 2, default: 0, transformer: new ColumnNumericTransformer() })
  balanceBefore: number;

  @Column('decimal', { precision: 20, scale: 2, default: 0, transformer: new ColumnNumericTransformer() })
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
