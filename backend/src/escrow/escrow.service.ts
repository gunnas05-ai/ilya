import { Injectable, NotFoundException, BadRequestException, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { EscrowTransaction, EscrowStatus } from './escrow-transaction.entity';
import { Dispute, DisputeStatus, DisputeReason } from './dispute.entity';
import { Load } from '../loads/load.entity';
import { TrackingRecord } from '../tracking/tracking.entity';
import { WalletService } from './wallet.service';
import { WebSocketGateway } from '../websocket/websocket.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { EscrowStateException } from '../common/exceptions';
import { QRCheckpointType } from '../qr/qr-code.entity';
import { FraudDetectionService, RiskTier } from './fraud-detection.service';
import { ICommissionService } from '../common/service-interfaces';
import { AuditLogService, AuditAction } from './audit-log.service';
import { EscrowMetricsService } from './escrow-metrics.service';
import { OutboxService } from './outbox.service';

@Injectable()
export class EscrowService {
  constructor(
    @InjectRepository(EscrowTransaction)
    private escrowRepo: Repository<EscrowTransaction>,
    @InjectRepository(Dispute)
    private disputeRepo: Repository<Dispute>,
    @InjectRepository(Load)
    private loadRepo: Repository<Load>,
    @InjectRepository(TrackingRecord)
    private trackingRepo: Repository<TrackingRecord>,
    private walletService: WalletService,
    private wsGateway: WebSocketGateway,
    private notificationsService: NotificationsService,
    private fraudDetectionService: FraudDetectionService,
    private auditLogService: AuditLogService,
    private metricsService: EscrowMetricsService,
    private outboxService: OutboxService,
    @Optional() private commissionService?: ICommissionService,
  ) {}

  async createEscrow(data: {
    loadId: string;
    shipperId: string;
    carrierId: string;
    amount: number;
    isMilestone?: boolean;
    totalMilestones?: number;
    milestonePercentages?: number[];
    milestoneTimeoutHours?: number;
    idempotencyKey?: string;
  }) {
    // Idempotency check
    if (data.idempotencyKey) {
      const existing = await this.escrowRepo.findOne({ where: { idempotencyKey: data.idempotencyKey } });
      if (existing) return existing;
    }

    // Lock funds from shipper's wallet
    try {
      await this.walletService.lockEscrow(data.shipperId, data.amount, `escrow_${data.loadId}`);
    } catch (err) {
      throw new BadRequestException('Güvenli ödeme için yetersiz bakiye. Lütfen cüzdanınıza para yükleyin.');
    }

    const totalMilestones = data.totalMilestones || 1;
    let milestonePercentages = data.milestonePercentages;
    if (data.isMilestone && !milestonePercentages) {
      // Default: equal split across milestones
      const equalShare = Math.floor(100 / totalMilestones);
      milestonePercentages = Array(totalMilestones).fill(equalShare);
      // Adjust last milestone to account for rounding
      const sum = milestonePercentages.reduce((a, b) => a + b, 0);
      if (sum < 100) milestonePercentages[totalMilestones - 1] += 100 - sum;
    }

    const escrow = this.escrowRepo.create({
      loadId: data.loadId,
      shipperId: data.shipperId,
      carrierId: data.carrierId,
      amount: data.amount,
      status: EscrowStatus.BEKLEMEDE,
      isMilestone: data.isMilestone || false,
      totalMilestones,
      milestonePercentages,
      milestoneTimeoutHours: data.milestoneTimeoutHours || 24,
      idempotencyKey: data.idempotencyKey,
    });

    const saved = await this.escrowRepo.save(escrow);

    // Notify
    await this.notificationsService.create({
      userId: data.carrierId,
      type: 'escrow_locked' as any,
      title: 'Güvenli Ödeme Bloke Edildi',
      message: `${data.amount.toLocaleString('tr-TR')} ₺ güvenli ödeme hesabında bloke edildi.`,
      data: { loadId: data.loadId, escrowId: saved.id, amount: data.amount },
    });

    this.wsGateway.sendToUser(data.carrierId, 'escrow_locked', {
      loadId: data.loadId,
      escrowId: saved.id,
      amount: data.amount,
    });

    // Audit log
    await this.auditLogService.log(AuditAction.ESCROW_CREATED, data.shipperId, saved.id, 'escrow', {
      loadId: data.loadId, carrierId: data.carrierId, amount: data.amount, isMilestone: data.isMilestone,
    });

    // Outbox — guaranteed delivery
    await this.outboxService.emit('escrow.created', {
      loadId: data.loadId, escrowId: saved.id, amount: data.amount,
      shipperId: data.shipperId, carrierId: data.carrierId,
    });

    // Emit events
    this.wsGateway.emitEscrowCreated(data.loadId, { escrowId: saved.id, amount: data.amount });
    this.wsGateway.emitEscrowFundsLocked(data.loadId, {
      escrowId: saved.id, amount: data.amount,
      shipperId: data.shipperId, carrierId: data.carrierId,
    });

    // Emit event for QR code generation (handled by QrService — no circular dep)
    this.eventEmitter.emit('escrow.created', {
      loadId: data.loadId,
      driverId: data.carrierId,
      customerId: data.shipperId,
      checkpointType: QRCheckpointType.PICKUP,
    });

    return saved;
  }

  async confirmPickup(escrowId: string) {
    const escrow = await this.escrowRepo.findOne({ where: { id: escrowId } });
    if (!escrow) throw new NotFoundException('Escrow işlemi bulunamadı');
    if (escrow.status !== EscrowStatus.BEKLEMEDE) {
      throw new EscrowStateException('Bu işlem zaten başlatılmış');
    }

    escrow.status = EscrowStatus.BLOKEDE;
    await this.escrowRepo.save(escrow);

    this.wsGateway.emitEscrowFundsLocked(escrow.loadId, {
      escrowId: escrow.id,
      loadId: escrow.loadId,
      status: escrow.status,
    });

    await this.auditLogService.log(AuditAction.ESCROW_FUNDS_LOCKED, escrow.shipperId, escrow.id, 'escrow', { loadId: escrow.loadId });

    return escrow;
  }

  /**
   * Orchestrate payment release: fraud check → risk handling → milestone/single release.
   * Delegates to sub-methods for readability and testability.
   */
  async releasePayment(escrowId: string, verificationData?: any) {
    const escrow = await this.escrowRepo.findOne({ where: { id: escrowId } });
    if (!escrow) throw new NotFoundException('Escrow işlemi bulunamadı');

    escrow.verificationData = verificationData;

    // Phase 1: Fraud assessment
    const assessment = await this.runFraudAssessment(escrow);
    if (!assessment) return; // handled internally (HIGH/MEDIUM risk)

    // Phase 2: Release funds (LOW risk)
    if (escrow.isMilestone) {
      return this.processMilestoneRelease(escrow);
    }
    return this.processSingleRelease(escrow);
  }

  // ── Private: Fraud assessment → blocks HIGH/MEDIUM, returns true for LOW ──
  private async runFraudAssessment(escrow: EscrowTransaction): Promise<boolean> {
    const load = await this.loadRepo.findOne({ where: { id: escrow.loadId } });
    const assessment = await this.fraudDetectionService.assess(load || new Load(), escrow.verificationData, escrow.carrierId);
    escrow.fraudScore = assessment.score;
    escrow.riskTier = assessment.tier;
    escrow.fraudDetails = { score: assessment.score, tier: assessment.tier, checks: assessment.checks, checkedAt: new Date() };
    await this.escrowRepo.save(escrow);

    if (assessment.tier === RiskTier.HIGH) {
      escrow.status = EscrowStatus.ITIRAZ_SURECINDE;
      await this.escrowRepo.save(escrow);
      this.metricsService.recordFraudAlert();
      await this.auditLogService.log(AuditAction.FRAUD_ALERT_TRIGGERED, escrow.carrierId, escrow.id, 'escrow', { fraudScore: assessment.score, tier: assessment.tier });
      await this.auditLogService.log(AuditAction.PAYMENT_ON_HOLD, escrow.shipperId, escrow.id, 'escrow', { reason: 'high_fraud_risk', score: assessment.score });
      this.notificationsService.create({ userId: escrow.shipperId, type: 'system' as any, title: 'Ödeme İncelemede', message: `Yüksek risk tespit edildi (puan: ${assessment.score}). Ödeme manuel incelemeye alındı.`, data: { escrowId: escrow.id, fraudScore: assessment.score } }).catch(() => {});
      this.wsGateway.sendToShipment(escrow.loadId, 'FRAUD_ALERT_TRIGGERED', { escrowId: escrow.id, fraudScore: assessment.score, tier: assessment.tier });
      return false;
    }

    if (assessment.tier === RiskTier.MEDIUM) {
      escrow.manualReviewRequired = true;
      escrow.status = EscrowStatus.BLOKEDE;
      await this.escrowRepo.save(escrow);
      this.metricsService.recordFraudAlert();
      await this.auditLogService.log(AuditAction.FRAUD_ALERT_TRIGGERED, escrow.carrierId, escrow.id, 'escrow', { fraudScore: assessment.score, tier: assessment.tier });
      this.notificationsService.create({ userId: escrow.shipperId, type: 'system' as any, title: 'Ödeme İnceleme Gerekli', message: `Orta düzey risk (puan: ${assessment.score}). Ödeme manuel onay bekliyor.`, data: { escrowId: escrow.id, fraudScore: assessment.score } }).catch(() => {});
      return false;
    }

    return true; // LOW risk — proceed
  }

  // ── Private: Milestone-based release ───────────────────────
  private async processMilestoneRelease(escrow: EscrowTransaction) {
    const releaseStart = Date.now();
    const isLastMilestone = escrow.completedMilestones + 1 >= escrow.totalMilestones;

    escrow.completedMilestones += 1;
    const milestoneIndex = escrow.completedMilestones - 1;
    const percentage = escrow.milestonePercentages?.[milestoneIndex] ?? (100 / escrow.totalMilestones);
    const milestoneAmount = Math.round(escrow.amount * percentage / 100 * 100) / 100;
    escrow.milestoneReleasedAmount += milestoneAmount;

    await this.walletService.releaseEscrow(escrow.carrierId, milestoneAmount, escrow.id);
    await this.walletService.confirmRelease(escrow.carrierId, milestoneAmount, escrow.id);

    this.wsGateway.sendToShipment(escrow.loadId, 'MILESTONE_COMPLETED', {
      escrowId: escrow.id, milestoneIndex, percentage, amount: milestoneAmount,
      completedMilestones: escrow.completedMilestones, totalMilestones: escrow.totalMilestones, riskTier: RiskTier.LOW,
    });
    await this.auditLogService.log(AuditAction.MILESTONE_COMPLETED, escrow.carrierId, escrow.id, 'escrow', { milestoneIndex, percentage, amount: milestoneAmount, riskTier: RiskTier.LOW });

    if (!isLastMilestone) {
      escrow.status = EscrowStatus.BLOKEDE;
      await this.escrowRepo.save(escrow);
      return { message: `Milestone ${escrow.completedMilestones}/${escrow.totalMilestones} tamamlandı (${percentage}% = ${milestoneAmount} ₺)`, escrow };
    }

    // Last milestone — release remaining and finalize
    const remainingAmount = Math.round((escrow.amount - escrow.milestoneReleasedAmount) * 100) / 100;
    if (remainingAmount > 0) {
      await this.walletService.releaseEscrow(escrow.carrierId, remainingAmount, escrow.id);
      await this.walletService.confirmRelease(escrow.carrierId, remainingAmount, escrow.id);
    }

    escrow.status = EscrowStatus.SERBEST_BIRAKILDI;
    escrow.releasedAmount = (escrow.releasedAmount || 0) + escrow.amount;
    await this.escrowRepo.save(escrow);

    const releaseTime = (Date.now() - releaseStart) / 1000;
    this.metricsService.recordReleaseTime(releaseTime, RiskTier.LOW);
    this.emitCommissionEvent(escrow);
    await this.finalizeRelease(escrow, escrow.amount, releaseTime);
    return { message: `Tüm milestone'lar tamamlandı. ${escrow.amount.toLocaleString('tr-TR')} ₺ serbest bırakıldı.`, escrow };
  }

  // ── Private: Single-payment release ────────────────────────
  private async processSingleRelease(escrow: EscrowTransaction) {
    const releaseStart = Date.now();
    const amount = escrow.amount;

    escrow.status = EscrowStatus.TESLIMAT_BEKLENIYOR;
    await this.escrowRepo.save(escrow);

    await this.walletService.releaseEscrow(escrow.carrierId, amount, escrow.id);
    await this.walletService.confirmRelease(escrow.carrierId, amount, escrow.id);

    this.emitCommissionEvent(escrow);

    escrow.status = EscrowStatus.SERBEST_BIRAKILDI;
    escrow.releasedAmount = (escrow.releasedAmount || 0) + amount;
    await this.escrowRepo.save(escrow);

    const releaseTime = (Date.now() - releaseStart) / 1000;
    this.metricsService.recordReleaseTime(releaseTime, RiskTier.LOW);
    await this.finalizeRelease(escrow, amount, releaseTime);
    return { message: 'Ödeme başarıyla serbest bırakıldı', escrow };
  }

  // ── Shared helpers ─────────────────────────────────────────
  private emitCommissionEvent(escrow: EscrowTransaction) {
    const commissionRate = parseFloat(process.env.PLATFORM_COMMISSION_RATE || '0');
    if (commissionRate > 0) {
      const commissionAmount = Math.round(escrow.amount * commissionRate * 100) / 100;
      if (commissionAmount > 0) {
        this.eventEmitter.emit('commission.charged', {
          escrowId: escrow.id, amount: escrow.amount, commission: commissionAmount,
          carrierId: escrow.carrierId, shipperId: escrow.shipperId,
        });
      }
    }
  }

  private async finalizeRelease(escrow: EscrowTransaction, amount: number, releaseTime: number) {
    await this.auditLogService.log(AuditAction.ESCROW_FUNDS_RELEASED, escrow.carrierId, escrow.id, 'escrow', { amount, tier: 'low', releaseTime });
    this.notificationsService.create({ userId: escrow.carrierId, type: 'payment_received' as any, title: 'Ödeme Alındı', message: `${amount.toLocaleString('tr-TR')} ₺ hesabınıza aktarıldı.`, data: { escrowId: escrow.id, amount } }).catch(() => {});
    this.wsGateway.sendToUser(escrow.carrierId, 'payment_released', { escrowId: escrow.id, amount });
    this.wsGateway.sendToUser(escrow.shipperId, 'payment_released', { escrowId: escrow.id, amount });
    await this.outboxService.emit('escrow.released', { loadId: escrow.loadId, escrowId: escrow.id, amount, carrierId: escrow.carrierId, tier: 'low' });
    this.wsGateway.emitEscrowReleased(escrow.loadId, { escrowId: escrow.id, amount, carrierId: escrow.carrierId });
    this.wsGateway.sendToShipment(escrow.loadId, 'DELIVERY_CONFIRMED', { escrowId: escrow.id, amount });
  }

  async openDispute(escrowId: string, userId: string, reason: DisputeReason, description: string, evidence?: any) {
    const escrow = await this.escrowRepo.findOne({ where: { id: escrowId } });
    if (!escrow) throw new NotFoundException('Escrow işlemi bulunamadı');

    const now = new Date();
    const deadline = new Date(now.getTime() + 72 * 60 * 60 * 1000); // 72 hours

    // Capture GPS tracking evidence for this load
    let gpsRouteEvidence = null;
    try {
      const trackingRecords = await this.trackingRepo.find({
        where: { loadId: escrow.loadId },
        order: { timestamp: 'DESC' },
        take: 50,
      });
      if (trackingRecords.length > 0) {
        gpsRouteEvidence = trackingRecords.map(r => ({
          latitude: r.latitude,
          longitude: r.longitude,
          timestamp: r.timestamp,
          speed: r.speed,
        }));
      }
    } catch (e) {
      // GPS tracking verisi alınamazsa devam et
    }

    escrow.status = EscrowStatus.ITIRAZ_SURECINDE;
    escrow.disputeReason = reason;
    escrow.disputeEvidence = evidence;
    escrow.disputeOpenedAt = now;
    await this.escrowRepo.save(escrow);

    const dispute = this.disputeRepo.create({
      escrowTransactionId: escrowId,
      openedByUserId: userId,
      reason,
      description,
      evidence: {
        userProvided: evidence,
        gpsRoute: gpsRouteEvidence,
        capturedAt: now.toISOString(),
      },
      status: DisputeStatus.OPEN,
      evidenceDeadline: deadline,
    });

    const saved = await this.disputeRepo.save(dispute);

    this.wsGateway.sendToUser(escrow.shipperId, 'dispute_opened', { escrowId, disputeId: saved.id });
    this.wsGateway.sendToUser(escrow.carrierId, 'dispute_opened', { escrowId, disputeId: saved.id });

    // Outbox — guaranteed delivery
    await this.outboxService.emit('escrow.disputed', {
      loadId: escrow.loadId, escrowId, disputeId: saved.id, reason, openedBy: userId,
    });

    this.metricsService.recordDispute(reason);
    this.wsGateway.emitEscrowDisputed(escrow.loadId, { escrowId, disputeId: saved.id, reason });
    this.wsGateway.sendToShipment(escrow.loadId, 'DISPUTE_OPENED', { escrowId, disputeId: saved.id, reason });

    await this.auditLogService.log(AuditAction.DISPUTE_OPENED, userId, saved.id, 'dispute', { escrowId, reason, description });

    return saved;
  }

  async resolveDispute(disputeId: string, resolvedByUserId: string, resolution: string, resolutionType: string, refundAmount?: number) {
    const dispute = await this.disputeRepo.findOne({ where: { id: disputeId } });
    if (!dispute) throw new NotFoundException('İhtilaf bulunamadı');

    const escrow = await this.escrowRepo.findOne({ where: { id: dispute.escrowTransactionId } });
    if (!escrow) throw new NotFoundException('Escrow işlemi bulunamadı');

    dispute.status = DisputeStatus.RESOLVED;
    dispute.resolvedByUserId = resolvedByUserId;
    dispute.resolution = resolution;
    dispute.resolutionType = resolutionType;
    dispute.refundAmount = refundAmount || 0;
    await this.disputeRepo.save(dispute);

    if (resolutionType === 'full_refund') {
      // Refund to shipper
      await this.walletService.credit(escrow.shipperId, escrow.amount, escrow.id, 'İhtilaf çözümü - tam iade');
      escrow.status = EscrowStatus.IPTAL_EDILDI;
    } else if (resolutionType === 'partial_refund' && refundAmount) {
      const carrierAmount = escrow.amount - refundAmount;
      await this.walletService.credit(escrow.shipperId, refundAmount, escrow.id, 'İhtilaf çözümü - kısmi iade');
      await this.walletService.credit(escrow.carrierId, carrierAmount, escrow.id, 'İhtilaf çözümü - kısmi ödeme');
      escrow.status = EscrowStatus.SERBEST_BIRAKILDI;
      escrow.releasedAmount = carrierAmount;
    } else {
      // Release full to carrier
      await this.walletService.credit(escrow.carrierId, escrow.amount, escrow.id, 'İhtilaf çözümü - tam ödeme');
      escrow.status = EscrowStatus.SERBEST_BIRAKILDI;
      escrow.releasedAmount = escrow.amount;
    }

    escrow.disputeResolvedBy = resolvedByUserId;
    escrow.disputeResolvedAt = new Date();
    escrow.disputeResolution = resolutionType;
    await this.escrowRepo.save(escrow);

    await this.auditLogService.log(AuditAction.DISPUTE_RESOLVED, resolvedByUserId, disputeId, 'dispute', { resolutionType, refundAmount, escrowId: escrow.id });

    return { dispute, escrow };
  }

  async getEscrowStatus(loadId: string) {
    return this.escrowRepo.findOne({ where: { loadId }, order: { createdAt: 'DESC' } });
  }

  async autoRefundExpiredMilestones() {
    // Find milestone escrows that have timed out using per-escrow timeout hours
    const now = new Date();
    const candidates = await this.escrowRepo.createQueryBuilder('escrow')
      .where('escrow.isMilestone = true')
      .andWhere('escrow.status IN (:...statuses)', { statuses: [EscrowStatus.BEKLEMEDE, EscrowStatus.BLOKEDE] })
      .andWhere('escrow.milestoneTimeoutHours IS NOT NULL')
      .getMany();

    // Filter by each escrow's own milestoneTimeoutHours
    const expired = candidates.filter(escrow => {
      const timeoutMs = (escrow.milestoneTimeoutHours || 24) * 60 * 60 * 1000;
      return new Date(escrow.updatedAt).getTime() + timeoutMs <= now.getTime();
    });

    const results: any[] = [];
    for (const escrow of expired) {
      try {
        // Full refund to shipper
        await this.walletService.credit(escrow.shipperId, escrow.amount, escrow.id, 'Milestone zaman aşımı - otomatik iade');
        escrow.status = EscrowStatus.IPTAL_EDILDI;
        await this.escrowRepo.save(escrow);

        await this.notificationsService.create({
          userId: escrow.shipperId,
          type: 'system' as any,
          title: 'Milestone Zaman Aşımı - İade',
          message: `Milestone süresi doldu. ${escrow.amount.toLocaleString('tr-TR')} ₺ iade edildi.`,
          data: { escrowId: escrow.id, amount: escrow.amount },
        });

        this.wsGateway.sendToShipment(escrow.loadId, 'MILESTONE_TIMEOUT_REFUND', {
          escrowId: escrow.id,
          amount: escrow.amount,
        });

        await this.auditLogService.log(AuditAction.ESCROW_CANCELLED, escrow.shipperId, escrow.id, 'escrow', {
          reason: 'milestone_timeout', autoRefund: true,
        });

        results.push({ escrowId: escrow.id, status: 'refunded' });
      } catch (err) {
        results.push({ escrowId: escrow.id, status: 'failed', error: err.message });
      }
    }
    return { processed: results.length, details: results };
  }

  async processQrScan(loadId: string, checkpointType: QRCheckpointType, scanData: {
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    speed?: number;
    deviceFingerprint?: string;
    ipAddress?: string;
  }) {
    const escrow = await this.escrowRepo.findOne({ where: { loadId }, order: { createdAt: 'DESC' } });
    if (!escrow) throw new NotFoundException('Bu yük için escrow işlemi bulunamadı');

    const verificationData = {
      gpsMismatch: false,
      speedAnomaly: (scanData.speed || 0) > 10, // >10 km/h at scan point is suspicious
      locationJump: false,
      duplicateScan: false,
      ...scanData,
    };

    switch (checkpointType) {
      case QRCheckpointType.PICKUP:
        return this.confirmPickup(escrow.id);

      case QRCheckpointType.DELIVERY:
        return this.releasePayment(escrow.id, verificationData);

      case QRCheckpointType.MILESTONE:
        if (escrow.isMilestone && escrow.completedMilestones < escrow.totalMilestones) {
          // Delegate to releasePayment which handles fraud assessment + per-milestone percentage release
          const result = await this.releasePayment(escrow.id, verificationData);
          this.wsGateway.sendToUser(escrow.shipperId, 'milestone_reached', {
            escrowId: escrow.id,
            loadId: escrow.loadId,
            completedMilestones: escrow.completedMilestones,
            totalMilestones: escrow.totalMilestones,
          });
          return result;
        }
        return { message: 'Milestone noktası kaydedildi', escrow };

      case QRCheckpointType.TRANSIT:
        escrow.verificationData = verificationData;
        await this.escrowRepo.save(escrow);

        this.wsGateway.sendToUser(escrow.shipperId, 'transit_checkpoint', {
          escrowId: escrow.id,
          loadId: escrow.loadId,
          location: { lat: scanData.latitude, lng: scanData.longitude },
        });

        return { message: 'Transit noktası kaydedildi', escrow };

      default:
        return { message: 'Bilinmeyen QR tipi', escrow };
    }
  }

  // ── Fraud Review ─────────────────────────────────────────

  async getFlaggedForReview() {
    const flagged = await this.escrowRepo.find({
      where: [
        { manualReviewRequired: true },
        { riskTier: RiskTier.MEDIUM },
        { riskTier: RiskTier.HIGH, status: EscrowStatus.ITIRAZ_SURECINDE },
      ],
      order: { updatedAt: 'DESC' },
      take: 50,
    });
    return flagged.map(e => ({
      id: e.id,
      loadId: e.loadId,
      amount: e.amount,
      status: e.status,
      fraudScore: e.fraudScore,
      riskTier: e.riskTier,
      fraudDetails: e.fraudDetails,
      manualReviewRequired: e.manualReviewRequired,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    }));
  }

  async reviewFraudCase(escrowId: string, adminId: string, decision: 'approve' | 'reject' | 'flag_for_dispute', note: string) {
    const escrow = await this.escrowRepo.findOne({ where: { id: escrowId } });
    if (!escrow) throw new NotFoundException('Escrow işlemi bulunamadı');
    if (!escrow.manualReviewRequired && escrow.riskTier !== RiskTier.MEDIUM && escrow.riskTier !== RiskTier.HIGH) {
      throw new BadRequestException('Bu işlem inceleme gerektirmiyor');
    }

    escrow.reviewedByUserId = adminId;
    escrow.reviewedAt = new Date();

    if (decision === 'approve') {
      // Release funds to carrier
      const remainingAmount = escrow.isMilestone
        ? Math.round((escrow.amount - escrow.milestoneReleasedAmount) * 100) / 100
        : escrow.amount;
      if (remainingAmount > 0) {
        await this.walletService.releaseEscrow(escrow.carrierId, remainingAmount, escrow.id);
        await this.walletService.confirmRelease(escrow.carrierId, remainingAmount, escrow.id);
      }
      escrow.status = EscrowStatus.SERBEST_BIRAKILDI;
      escrow.releasedAmount = (escrow.releasedAmount || 0) + remainingAmount;
      escrow.manualReviewRequired = false;
      await this.escrowRepo.save(escrow);

      await this.auditLogService.log(AuditAction.ESCROW_FUNDS_RELEASED, adminId, escrow.id, 'escrow', {
        amount: remainingAmount, decision: 'approve', note,
      });

      this.wsGateway.sendToUser(escrow.shipperId, 'fraud_review_approved', { escrowId: escrow.id, amount: remainingAmount });
      this.wsGateway.sendToUser(escrow.carrierId, 'fraud_review_approved', { escrowId: escrow.id, amount: remainingAmount });
      this.wsGateway.sendToShipment(escrow.loadId, 'FRAUD_REVIEW_RESOLVED', { escrowId: escrow.id, decision: 'approve' });

      return { message: 'Ödeme manuel inceleme sonrası serbest bırakıldı', escrow };
    }

    if (decision === 'reject') {
      // Full refund to shipper
      await this.walletService.credit(escrow.shipperId, escrow.amount, escrow.id, 'Fraud inceleme - iade');
      escrow.status = EscrowStatus.IPTAL_EDILDI;
      escrow.manualReviewRequired = false;
      await this.escrowRepo.save(escrow);

      await this.auditLogService.log(AuditAction.ESCROW_CANCELLED, adminId, escrow.id, 'escrow', {
        reason: 'fraud_review_rejected', note,
      });

      this.wsGateway.sendToUser(escrow.shipperId, 'fraud_review_rejected', { escrowId: escrow.id, amount: escrow.amount });
      this.wsGateway.sendToUser(escrow.carrierId, 'fraud_review_rejected', { escrowId: escrow.id, amount: escrow.amount });
      this.wsGateway.sendToShipment(escrow.loadId, 'FRAUD_REVIEW_RESOLVED', { escrowId: escrow.id, decision: 'reject' });

      return { message: 'Ödeme fraud inceleme sonrası iade edildi', escrow };
    }

    if (decision === 'flag_for_dispute') {
      // Move to dispute
      escrow.status = EscrowStatus.ITIRAZ_SURECINDE;
      escrow.manualReviewRequired = false;
      await this.escrowRepo.save(escrow);

      await this.auditLogService.log(AuditAction.PAYMENT_ON_HOLD, adminId, escrow.id, 'escrow', {
        reason: 'flagged_for_dispute', note,
      });

      return { message: 'İşlem ihtilafa yönlendirildi', escrow };
    }

    throw new BadRequestException('Geçersiz karar (approve/reject/flag_for_dispute)');
  }

  @OnEvent('delivery.completed.verified')
  async handleDeliveryCompletedVerified(payload: { loadId: string; driverId: string; shipperId: string; pdfUrl: string }) {
    // Find the pending escrow for this load
    const escrow = await this.escrowRepo.findOne({
      where: { loadId: payload.loadId, status: EscrowStatus.BLOKEDE },
      order: { createdAt: 'DESC' },
    });

    if (escrow) {
      // Release payment automatically using the ePOD as verification data
      await this.releasePayment(escrow.id, {
        pdfUrl: payload.pdfUrl,
        ePODVerified: true,
        geoVerified: true,
      });

      this.wsGateway.sendToShipment(payload.loadId, 'EPOD_ESCROW_RELEASED', {
        escrowId: escrow.id,
        amount: escrow.amount,
        pdfUrl: payload.pdfUrl,
      });
    }
  }
}
