import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  OneToMany, ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';

@Entity('shippers')
export class Shipper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ length: 200 })
  companyName: string;

  @Column({ length: 11, unique: true })
  vkn: string;

  @Column({ length: 150, nullable: true })
  contactEmail: string;

  @Column({ length: 20, nullable: true })
  contactPhone: string;

  @Column({ type: 'uuid', nullable: true })
  apiKeyId: string;

  @Column({ length: 500, nullable: true })
  webhookUrl: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ length: 30, default: 'standard' })
  contractType: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  discountRate: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
