import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentMethod } from '../payment/entities/payment-method.entity';
import { PaymentTransaction } from '../payment/entities/payment-transaction.entity';
import { Wallet, WalletTransaction } from '../escrow/wallet.entity';
import { EscrowTransaction } from '../escrow/escrow-transaction.entity';
import { SubscriptionPlan } from '../billing/entities/subscription-plan.entity';
import { CreditPackage } from '../billing/entities/credit-package.entity';
import { CommissionConfig } from '../billing/entities/commission-config.entity';
import { WalletLedger } from './entities/ledger.entity';
import { AdminRevenueController } from './admin-revenue.controller';
import { AdminRevenueService } from './admin-revenue.service';

/**
 * Payment Core — Birleşik Ödeme Modülü
 * Tüm ödeme, escrow, cüzdan, komisyon, kontör işlemleri bu modül altında.
 * Double Entry Ledger ile tüm işlemler çift taraflı kaydedilir.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentMethod, PaymentTransaction,
      Wallet, WalletTransaction, EscrowTransaction,
      SubscriptionPlan, CreditPackage, CommissionConfig,
      WalletLedger,
    ]),
  ],
  controllers: [AdminRevenueController],
  providers: [AdminRevenueService],
  exports: [AdminRevenueService],
})
export class PaymentCoreModule {}
