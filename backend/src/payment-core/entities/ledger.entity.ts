import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * Double Entry Ledger — Çift Taraflı Kayıt Sistemi
 * Her işlem hem debit (çıkan) hem credit (giren) taraflı kaydedilir.
 * Bu sayede muhasebe kaydı ve işlem geçmişi tam olarak tutulur.
 *
 * Örnek: Escrow release
 *   debit: platform_wallet (-komisyon)  → platform commission revenue
 *   credit: driver_wallet (+navlun-komisyon) → driver earnings
 */
@Entity('wallet_ledger')
@Index(['transactionId'])
@Index(['debitUserId', 'createdAt'])
@Index(['creditUserId', 'createdAt'])
export class WalletLedger {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  transactionId: string; // Bağlı işlem (escrow, payment, credit vb.)

  @Column({ type: 'uuid', nullable: true })
  debitUserId: string;  // Kimden çıktı (platform, kullanıcı)

  @Column({ type: 'uuid', nullable: true })
  creditUserId: string; // Kime girdi

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;       // Kuruş cinsinden

  @Column({ length: 30 })
  type: string;         // 'escrow_lock', 'escrow_release', 'commission', 'credit_purchase', 'withdrawal', 'refund', 'payout', 'subscription'

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  debitBalanceAfter: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  creditBalanceAfter: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn()
  @Index()
  createdAt: Date;
}
