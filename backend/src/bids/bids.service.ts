/**
 * BidsService — Teklif yonetimi (388 satir).
 *
 * REFACTOR PLANI:
 *   - BidPlacementService  (teklif verme, guncelleme, iptal)
 *   - BidMatchingService   (kabul/red/karsi teklif)
 *   - BidNotificationService (WebSocket + push bildirim)
 *   - Escrow orchestration'i ayri bir saga/state machine'e tasi
 */
import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Bid, BidStatus } from './bid.entity';
import { Load } from '../loads/load.entity';
import { User } from '../users/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { WebSocketGateway } from '../websocket/websocket.gateway';
import { EscrowService } from '../escrow/escrow.service';
import { UetdsService } from '../uetds/uetds.service';
import { CarrierScorecardService } from '../analytics/carrier-scorecard.service';
import { LoadStatus } from '../loads/load.entity';

@Injectable()
export class BidsService {
  constructor(
    @InjectRepository(Bid)
    private bidRepo: Repository<Bid>,
    @InjectRepository(Load)
    private loadRepo: Repository<Load>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private notificationsService: NotificationsService,
    private wsGateway: WebSocketGateway,
    private eventEmitter: EventEmitter2,
    @Inject(forwardRef(() => EscrowService))
    private escrowService: EscrowService,
    private uetdsService: UetdsService,
    private scorecardService: CarrierScorecardService,
  ) {}

  async placeBid(data: {
    loadId: string;
    carrierId: string;
    carrierName: string;
    amount: number;
    note: string;
    estimatedDeliveryDays: number;
    hasReturnLoad: boolean;
    validDuration: number;
    pickupTime?: string;
    requestEscrow?: boolean;
  }) {
    const load = await this.loadRepo.findOne({ where: { id: data.loadId } });
    if (!load) throw new NotFoundException('Yük bulunamadı');
    if (load.creatorId === data.carrierId) {
      throw new ForbiddenException('Kendi yükünüze teklif veremezsiniz');
    }

    // Profile completeness check
    const carrier = await this.userRepo.findOne({ where: { id: data.carrierId } });
    if (carrier) {
      const missingFields: string[] = [];
      if (!carrier.licenseNumber) missingFields.push('Ehliyet Bilgisi');
      if (!carrier.plateNumber) missingFields.push('Araç Plakası');
      if (!carrier.vehicleType) missingFields.push('Araç Tipi');
      if (!carrier.vehicleCapacity) missingFields.push('Araç Kapasitesi');
      if (!carrier.tonnageCapacity) missingFields.push('Tonaj Bilgisi');
      if (!carrier.volumeCapacity) missingFields.push('Hacim Bilgisi');
      if (!carrier.kBelgesi) missingFields.push('K Belgesi');
      if (!carrier.srcBelgesi) missingFields.push('SRC Belgesi');
      if (!carrier.iban) missingFields.push('IBAN Bilgisi');
      if (!carrier.taxNumber) missingFields.push('Vergi Bilgisi');

      if (missingFields.length > 0) {
        throw new BadRequestException(
          `Teklif vermek için profil bilgilerinizi tamamlayın. Eksik alanlar: ${missingFields.join(', ')}`,
        );
      }

      if (data.requestEscrow && !carrier.escrowAccountVerified) {
        throw new BadRequestException('Güvenli ödeme alabilmek için hesabınızı doğrulayın');
      }
    }

    // EX-008: Check carrier scorecard for restrictions
    const scorecard = await this.scorecardService.getBidderScore(data.carrierId);
    if (scorecard.escrowRequired && load.escrow !== true) {
      throw new BadRequestException(
        `Taşıyıcı skorunuz (%${scorecard.overallScore} - ${scorecard.tierLabel}) nedeniyle bu yük için Escrow (Güvenli Ödeme) zorunludur. Lütfen escrow'lu bir yük seçin.`,
      );
    }
    if (scorecard.escrowRequired && !data.requestEscrow) {
      // Force escrow for low-score carriers
      data.requestEscrow = true;
    }

    const commission = Math.round(data.amount * 0.08);
    const escrowFee = Math.round(data.amount * 0.03);
    const vat = Math.round(data.amount * 0.20);
    const netAmount = data.amount - commission - escrowFee;

    const bid = this.bidRepo.create({
      loadId: data.loadId,
      carrierId: data.carrierId,
      amount: data.amount,
      note: data.note,
      estimatedDeliveryDays: data.estimatedDeliveryDays,
      hasReturnLoad: data.hasReturnLoad,
      pickupTime: data.pickupTime,
      requestEscrow: data.requestEscrow || false,
      validUntil: new Date(Date.now() + data.validDuration * 60000),
      status: BidStatus.PENDING,
      platformCommission: commission,
      escrowFee,
      vat,
      netAmount,
    });

    const saved = await this.bidRepo.save(bid);
    await this.loadRepo.increment({ id: data.loadId }, 'bidCount', 1);

    // EX-008: Emit bid.placed event for scorecard
    this.eventEmitter.emit('bid.placed', {
      carrierId: data.carrierId,
      responseTimeMinutes: 0,
    });

    // Notify load creator
    await this.notificationsService.create({
      userId: load.creatorId,
      type: 'new_bid' as any,
      title: 'Yeni Teklif',
      message: `${data.carrierName} tarafından ${data.amount.toLocaleString('tr-TR')} ₺ teklif verildi`,
      data: { loadId: data.loadId, bidId: saved.id, amount: data.amount },
    });

    this.wsGateway.sendToUser(load.creatorId, 'new_bid', {
      loadId: data.loadId,
      bidId: saved.id,
      amount: data.amount,
      carrierName: data.carrierName,
    });

    return saved;
  }

  async getBidsForLoad(loadId: string) {
    const bids = await this.bidRepo.find({
      where: { loadId },
      order: { createdAt: 'DESC' },
      relations: ['carrier'],
    });

    // EX-008: Enrich bids with carrier scores
    const enriched = await Promise.all(
      bids.map(async (bid) => {
        const score = await this.scorecardService.getBidderScore(bid.carrierId).catch(() => null);
        return {
          ...bid,
          carrierScore: score ? {
            overallScore: score.overallScore,
            scoreTier: score.scoreTier,
            tierLabel: score.tierLabel,
            tierColor: score.tierColor,
            totalCompletedLoads: score.totalCompletedLoads,
          } : null,
        };
      }),
    );

    return enriched;
  }

  async getMyBids(carrierId: string) {
    const bids = await this.bidRepo.find({
      where: { carrierId },
      order: { createdAt: 'DESC' },
      relations: ['load'],
    });

    // Include own score
    const score = await this.scorecardService.getBidderScore(carrierId).catch(() => null);

    return bids.map(bid => ({
      ...bid,
      myScore: score,
    }));
  }

  async acceptBid(bidId: string, userId: string) {
    const bid = await this.bidRepo.findOne({
      where: { id: bidId },
      relations: ['load'],
    });
    if (!bid) throw new NotFoundException('Teklif bulunamadı');
    if (bid.load.creatorId !== userId) {
      throw new ForbiddenException('Bu teklifi kabul etme yetkiniz yok');
    }
    if (bid.status !== BidStatus.PENDING && bid.status !== BidStatus.COUNTERED) {
      throw new ForbiddenException('Bu teklif artık kabul edilemez');
    }

    bid.status = BidStatus.ACCEPTED;
    await this.bidRepo.save(bid);

    bid.load.status = LoadStatus.YOLDA;
    bid.load.receiverId = bid.carrierId;
    await this.loadRepo.save(bid.load);

    // EX-008: Emit bid.accepted event
    this.eventEmitter.emit('bid.accepted', { carrierId: bid.carrierId });

    // EX-012: Emit load.status_changed for webhooks
    this.eventEmitter.emit('load.status_changed', {
      loadId: bid.loadId,
      loadNo: bid.load.loadNo,
      previousStatus: 'beklemede',
      newStatus: 'yolda',
      carrierId: bid.carrierId,
      timestamp: new Date().toISOString(),
    });

    try {
      await this.uetdsService.queueUetdsNotification(bid.loadId, {
        shipperId: bid.load.creatorId,
        carrierId: bid.carrierId,
        loadNo: bid.load.loadNo,
        pickupDate: bid.load.pickupDate,
        amount: bid.amount,
      });
    } catch (err) {
      console.error('Failed to trigger UETDS notification:', err);
    }

    await this.bidRepo.update(
      { loadId: bid.loadId, status: BidStatus.PENDING },
      { status: BidStatus.REJECTED },
    );

    // EX-008: Emit rejection for other bidders
    const otherBids = await this.bidRepo.find({
      where: { loadId: bid.loadId, status: BidStatus.REJECTED },
    });
    for (const other of otherBids) {
      this.eventEmitter.emit('bid.rejected', { carrierId: other.carrierId });
    }

    this.wsGateway.sendToUser(bid.carrierId, 'bid_accepted', {
      bidId: bid.id,
      loadId: bid.loadId,
      amount: bid.amount,
    });

    if (bid.requestEscrow) {
      try {
        await this.escrowService.createEscrow({
          loadId: bid.loadId,
          shipperId: bid.load.creatorId,
          carrierId: bid.carrierId,
          amount: bid.amount,
          idempotencyKey: `escrow_bid_${bid.id}`,
        });
      } catch (err) {
        await this.notificationsService.create({
          userId: bid.load.creatorId,
          type: 'system' as any,
          title: 'Güvenli Ödeme Oluşturulamadı',
          message: `Teklif kabul edildi ancak güvenli ödeme oluşturulamadı: ${err.message}.`,
          data: { bidId: bid.id, loadId: bid.loadId },
        });
      }
    }

    return bid;
  }

  async rejectBid(bidId: string, userId: string) {
    const bid = await this.bidRepo.findOne({
      where: { id: bidId },
      relations: ['load'],
    });
    if (!bid) throw new NotFoundException('Teklif bulunamadı');
    if (bid.load.creatorId !== userId) {
      throw new ForbiddenException('Bu teklifi reddetme yetkiniz yok');
    }

    bid.status = BidStatus.REJECTED;
    await this.bidRepo.save(bid);

    // EX-008: Emit bid.rejected event
    this.eventEmitter.emit('bid.rejected', { carrierId: bid.carrierId });

    this.wsGateway.sendToUser(bid.carrierId, 'bid_rejected', {
      bidId: bid.id,
      loadId: bid.loadId,
    });

    return bid;
  }

  async counterBid(bidId: string, userId: string, counterAmount: number, counterNote: string) {
    const bid = await this.bidRepo.findOne({
      where: { id: bidId },
      relations: ['load'],
    });
    if (!bid) throw new NotFoundException('Teklif bulunamadı');
    if (bid.load.creatorId !== userId) {
      throw new ForbiddenException('Karşı teklif yapma yetkiniz yok');
    }

    bid.status = BidStatus.COUNTERED;
    bid.counterAmount = counterAmount;
    bid.counterNote = counterNote;
    bid.counteredAt = new Date();
    await this.bidRepo.save(bid);

    this.wsGateway.sendToUser(bid.carrierId, 'counter_bid', {
      bidId: bid.id,
      loadId: bid.loadId,
      counterAmount,
      counterNote,
    });

    return bid;
  }

  async acceptCounter(bidId: string, userId: string) {
    const bid = await this.bidRepo.findOne({
      where: { id: bidId },
      relations: ['load'],
    });
    if (!bid) throw new NotFoundException('Teklif bulunamadı');
    if (bid.carrierId !== userId) {
      throw new ForbiddenException('Bu karşı teklifi kabul etme yetkiniz yok');
    }
    if (bid.status !== BidStatus.COUNTERED) {
      throw new ForbiddenException('Karşı teklif artık geçerli değil');
    }

    bid.status = BidStatus.ACCEPTED;
    await this.bidRepo.save(bid);

    // EX-008
    this.eventEmitter.emit('bid.accepted', { carrierId: bid.carrierId });

    await this.bidRepo.update(
      { loadId: bid.loadId, status: BidStatus.PENDING },
      { status: BidStatus.REJECTED },
    );

    this.wsGateway.sendToUser(bid.load.creatorId, 'bid_accepted', {
      bidId: bid.id,
      loadId: bid.loadId,
      amount: bid.counterAmount,
    });

    if (bid.requestEscrow) {
      try {
        const escrowAmount = bid.counterAmount || bid.amount;
        await this.escrowService.createEscrow({
          loadId: bid.loadId,
          shipperId: bid.load.creatorId,
          carrierId: bid.carrierId,
          amount: escrowAmount,
          idempotencyKey: `escrow_bid_${bid.id}`,
        });
      } catch (err) {
        await this.notificationsService.create({
          userId: bid.load.creatorId,
          type: 'system' as any,
          title: 'Güvenli Ödeme Oluşturulamadı',
          message: `Karşı teklif kabul edildi ancak güvenli ödeme oluşturulamadı: ${err.message}.`,
          data: { bidId: bid.id, loadId: bid.loadId },
        });
      }
    }

    return bid;
  }

  async cancelBid(bidId: string, userId: string) {
    const bid = await this.bidRepo.findOne({ where: { id: bidId, carrierId: userId } });
    if (!bid) throw new NotFoundException('Teklif bulunamadı');
    if (bid.status === BidStatus.ACCEPTED) {
      throw new ForbiddenException('Kabul edilmiş teklif iptal edilemez');
    }

    bid.status = BidStatus.EXPIRED;
    await this.bidRepo.save(bid);

    // EX-008
    this.eventEmitter.emit('bid.cancelled', { carrierId: bid.carrierId });

    return bid;
  }
}
