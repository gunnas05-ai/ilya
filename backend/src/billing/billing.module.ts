import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { UserSubscription } from './entities/user-subscription.entity';
import { CreditPackage } from './entities/credit-package.entity';
import { UserCredit, CreditTransaction } from './entities/user-credit.entity';
import { BillingController } from './billing.controller';
import { SubscriptionService } from './subscription.service';
import { CreditService } from './credit.service';
import { CommissionService } from './commission.service';
import { CommissionConfig } from './entities/commission-config.entity';
import { PaymentTransaction } from '../payment/entities/payment-transaction.entity';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SubscriptionPlan, UserSubscription, CreditPackage, UserCredit, CreditTransaction,
      CommissionConfig, PaymentTransaction,
    ]),
    PaymentModule,
  ],
  controllers: [BillingController],
  providers: [SubscriptionService, CreditService, CommissionService],
  exports: [SubscriptionService, CreditService, CommissionService],
})
export class BillingModule {}
