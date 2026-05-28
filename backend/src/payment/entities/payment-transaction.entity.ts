import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('payment_transactions')
@Index(['userId', 'createdAt'])
@Index(['status', 'createdAt'])
export class PaymentTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @Column({ type: 'uuid', nullable: true })
  paymentMethodId: string;

  @Column({ length: 30 })
  type: string;
  // 'subscription'     → Abonelik ödemesi
  // 'credits'          → Kontör satın alma
  // 'escrow_deposit'   → Escrow'a para yatırma
  // 'escrow_release'   → Escrow serbest bırakma
  // 'early_payment'    → Erken ödeme (faktoring)
  // 'insurance'        → Sigorta primi
  // 'fuel_card'        → Yakıt kartı yükleme
  // 'refund'           → İade

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ length: 3, default: 'TRY' })
  currency: string;

  @Column({ length: 100, nullable: true })
  providerRef: string; // İyzico/Stripe referans numarası

  @Column({ length: 20, default: 'pending' })
  status: string; // 'pending', 'success', 'failed', 'refunded', 'cancelled'

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ length: 100, unique: true })
  idempotencyKey: string; // Tekrarlı ödemeyi önler

  @Column({ type: 'uuid', nullable: true })
  referenceId: string; // Bağlı olduğu işlem (escrowId, subscriptionId vb.)

  @Column({ length: 30, nullable: true })
  referenceType: string; // 'escrow', 'subscription', 'credits', 'insurance'

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
