import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';

export enum InviteStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  EXPIRED = 'expired',
}

@Entity('finance_invites')
export class FinanceInvite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  ownerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column({ length: 20, unique: true })
  code: string;

  @Column({ length: 50 })
  roleToAssign: string; // member, driver, etc.

  @Column({ nullable: true })
  vehicleId: string;

  @Column({ type: 'simple-enum', enum: InviteStatus, default: InviteStatus.PENDING })
  status: InviteStatus;

  @Column('timestamp')
  expiresAt: Date;

  @Column({ default: 1 })
  usageLimit: number;

  @Column({ default: 0 })
  usageCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
