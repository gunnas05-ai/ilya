import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { IncomeType } from './income.entity';

@Entity('recurring_income_templates')
export class RecurringIncomeTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'simple-enum', enum: IncomeType })
  type: IncomeType;

  @Column('decimal', { precision: 12, scale: 2 })
  amount: number;

  @Column({ length: 3, default: 'TRY' })
  currency: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({ length: 50 })
  cronExpression: string;

  @Column('timestamp', { nullable: true })
  lastRunAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
