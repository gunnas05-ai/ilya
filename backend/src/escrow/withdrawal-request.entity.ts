import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum WithdrawalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
}

export enum WithdrawalType {
  STANDARD = 'standard',
  IBAN_TRANSFER = 'iban_transfer',
  FUEL_ADVANCE = 'fuel_advance',
  MILESTONE_PAYOUT = 'milestone_payout',
  CASHBACK = 'cashback',
}

@Entity('withdrawal_requests')
export class WithdrawalRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  walletId: string;

  @Column('float')
  amount: number;

  @Column({ type: 'simple-enum', enum: WithdrawalStatus, default: WithdrawalStatus.PENDING })
  status: WithdrawalStatus;

  @Column({ type: 'simple-enum', enum: WithdrawalType, default: WithdrawalType.STANDARD })
  type: WithdrawalType;

  @Column({ nullable: true })
  iban: string;

  @Column({ nullable: true })
  bankName: string;

  @Column({ nullable: true })
  accountHolderName: string;

  @Column({ nullable: true })
  referenceId: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('text', { nullable: true })
  adminNote: string;

  @Column({ nullable: true })
  processedById: string;

  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date;

  @Column({ default: 0 })
  retryCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
