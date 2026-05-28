import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Load } from '../loads/load.entity';
import { User } from '../users/user.entity';

export enum BidStatus {
  PENDING = 'pending',
  COUNTERED = 'countered',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

@Entity('bids')
export class Bid {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  loadId: string;

  @ManyToOne(() => Load)
  @JoinColumn({ name: 'loadId' })
  load: Load;

  @Column()
  carrierId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'carrierId' })
  carrier: User;

  @Column('float')
  amount: number;

  @Column('text')
  note: string;

  @Column('int')
  estimatedDeliveryDays: number;

  @Column({ default: false })
  hasReturnLoad: boolean;

  @Column({ nullable: true })
  pickupTime: string;

  @Column({ default: false })
  requestEscrow: boolean;

  @Column({ type: 'timestamp' })
  validUntil: Date;

  @Column({ type: 'simple-enum', enum: BidStatus, default: BidStatus.PENDING })
  status: BidStatus;

  // Counter offer fields
  @Column('float', { nullable: true })
  counterAmount: number;

  @Column('text', { nullable: true })
  counterNote: string;

  @Column({ type: 'timestamp', nullable: true })
  counteredAt: Date;

  // Financial calculations
  @Column('float', { default: 0 })
  platformCommission: number;

  @Column('float', { default: 0 })
  escrowFee: number;

  @Column('float', { default: 0 })
  vat: number;

  @Column('float', { default: 0 })
  netAmount: number;

  @CreateDateColumn()
  createdAt: Date;
}
