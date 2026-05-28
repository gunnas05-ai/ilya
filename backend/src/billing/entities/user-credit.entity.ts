import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('user_credits')
export class UserCredit {
  @PrimaryColumn({ type: 'uuid' })
  userId: string;

  @Column({ type: 'int', default: 0 })
  balance: number;

  @Column({ type: 'int', default: 0 })
  totalPurchased: number;

  @Column({ type: 'int', default: 0 })
  totalUsed: number;

  @Column({ default: false })
  autoReload: boolean;

  @Column({ type: 'uuid', nullable: true })
  autoReloadPackageId: string;

  @Column({ default: 10 })
  autoReloadThreshold: number; // Bu sayının altına düşünce otomatik yükle
}

@Entity('credit_transactions')
export class CreditTransaction {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ length: 20 })
  type: string; // 'purchase', 'usage', 'refund', 'bonus', 'auto_reload'

  @Column({ type: 'int' })
  amount: number; // +pozitif (yükleme), -negatif (kullanım)

  @Column({ type: 'int' })
  balanceAfter: number;

  @Column({ length: 30, nullable: true })
  referenceType: string; // 'invoice', 'package', 'refund'

  @Column({ type: 'uuid', nullable: true })
  referenceId: string;

  @Column({ type: 'timestamp', default: () => 'NOW()' })
  createdAt: Date;
}
