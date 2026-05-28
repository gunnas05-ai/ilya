import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('finance_reminders')
export class FinanceReminder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ length: 100 })
  title: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({ length: 50 })
  type: string; 

  @Column('timestamp')
  dueDate: Date;

  @Column({ default: false })
  isCompleted: boolean;

  @Column({ nullable: true })
  vehicleId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
