import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { EscrowTransaction } from './escrow-transaction.entity';
import { Wallet, WalletTransaction } from './wallet.entity';
import { Dispute } from './dispute.entity';
import { DisputeEvidence } from './dispute-evidence.entity';
import { Load } from '../loads/load.entity';
import { TrackingRecord } from '../tracking/tracking.entity';
import { WithdrawalRequest } from './withdrawal-request.entity';
import { AuditLog } from './audit-log.entity';
import { OutboxEvent } from './outbox.entity';
import { QRCode } from '../qr/qr-code.entity';
import { EscrowController } from './escrow.controller';
import { EscrowService } from './escrow.service';
import { WalletService } from './wallet.service';
import { WithdrawalService } from './withdrawal.service';
import { DisputeEvidenceService } from './dispute-evidence.service';
import { FraudDetectionService } from './fraud-detection.service';
import { AuditLogService } from './audit-log.service';
import { EscrowMetricsService, metricProviders } from './escrow-metrics.service';
import { OutboxService } from './outbox.service';
import { MockPaymentProvider } from './providers/mock-payment.provider';
import { PaymentGatewayService } from './payment-gateway.service';
import { InsurancePolicy } from './insurance.entity';
import { FintechService } from './fintech.service';
import { InsuranceService } from './insurance.service';
import { QuickPayService } from './quickpay.service';
import { WebSocketModule } from '../websocket/websocket.module';
import { NotificationsModule } from '../notifications/notifications.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([EscrowTransaction, Wallet, WalletTransaction, Dispute, DisputeEvidence, Load, TrackingRecord, QRCode, WithdrawalRequest, AuditLog, OutboxEvent, InsurancePolicy]),
    MulterModule.register({ storage: memoryStorage() }),
    WebSocketModule,
    NotificationsModule,
  ],
  controllers: [EscrowController],
  providers: [
    EscrowService, WalletService, WithdrawalService, DisputeEvidenceService,
    FraudDetectionService, AuditLogService, EscrowMetricsService, ...metricProviders, OutboxService,
    QuickPayService,
    MockPaymentProvider,
    PaymentGatewayService,
    FintechService, InsuranceService,
  ],
  exports: [EscrowService, WalletService, AuditLogService, EscrowMetricsService, PaymentGatewayService, InsuranceService],
})
export class EscrowModule {}
