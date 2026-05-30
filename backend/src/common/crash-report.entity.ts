import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('crash_reports')
export class CrashReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ nullable: true })
  userId: string;

  @Column({ nullable: true, length: 100 })
  userEmail: string;

  @Column({ length: 50 })
  platform: string; // 'ios' | 'android'

  @Column({ nullable: true, length: 20 })
  appVersion: string;

  @Column({ type: 'text' })
  errorMessage: string;

  @Column({ nullable: true, type: 'text' })
  stackTrace: string;

  @Column({ nullable: true, length: 50 })
  screen: string;

  @Column({ length: 20, default: 'new' })
  status: 'new' | 'investigating' | 'resolved' | 'wontfix';

  @Column({ default: 0 })
  occurrenceCount: number;

  @Column({ nullable: true })
  lastOccurredAt: Date;

  @Column({ nullable: true, length: 100 })
  environment: string; // 'development' | 'staging' | 'production'

  @CreateDateColumn()
  createdAt: Date;
}
