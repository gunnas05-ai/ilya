import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('subscription_plans')
export class SubscriptionPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 30, unique: true })
  name: string; // 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'

  @Column({ length: 100 })
  displayName: string; // 'Başlangıç', 'Profesyonel', 'Kurumsal'

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  monthlyPrice: number; // 199.00

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  yearlyPrice: number;  // 1910.40 (%20 indirimli)

  @Column({ type: 'int', default: 10 })
  maxLoads: number; // Aylık yük limiti (-1 = limitsiz)

  @Column({ type: 'int', default: 2 })
  maxUsers: number;

  @Column({ type: 'jsonb', nullable: true })
  features: Record<string, any>;
  // { webhook: true, api: false, sla: false, premium_support: false, white_label: false }

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;
}
