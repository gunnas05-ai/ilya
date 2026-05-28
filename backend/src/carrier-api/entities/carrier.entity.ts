import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';

@Entity('carriers')
export class Carrier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ default: 1 })
  fleetSize: number;

  @Column({ length: 200, nullable: true })
  operatingRegion: string;

  @Column({ type: 'simple-array', nullable: true })
  preferredLanes: string[];

  @Column({ length: 50, nullable: true })
  insurancePolicyNo: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  safetyRating: number;

  @Column({ type: 'uuid', nullable: true })
  apiKeyId: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
