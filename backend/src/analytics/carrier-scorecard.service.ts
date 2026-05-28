import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { CarrierScorecard, ScoreTier } from './carrier-scorecard.entity';

@Injectable()
export class CarrierScorecardService {
  private readonly logger = new Logger(CarrierScorecardService.name);

  constructor(
    @InjectRepository(CarrierScorecard)
    private scorecardRepo: Repository<CarrierScorecard>,
  ) {}

  async getOrCreate(carrierId: string): Promise<CarrierScorecard> {
    let sc = await this.scorecardRepo.findOne({ where: { carrierId } });
    if (!sc) {
      sc = this.scorecardRepo.create({ carrierId });
      await this.scorecardRepo.save(sc);
    }
    return sc;
  }

  /** EX-008: Update scorecard on shipment completion */
  @OnEvent('shipment.completed')
  @OnEvent('delivery.completed.verified')
  async onShipmentCompleted(payload: {
    carrierId?: string;
    driverId?: string;
    loadId: string;
    onTime?: boolean;
    revenue?: number;
    rating?: number;
    amount?: number;
  }) {
    const carrierId = payload.carrierId || payload.driverId;
    if (!carrierId) return;
    const sc = await this.getOrCreate(carrierId);

    const revenue = payload.revenue || payload.amount || 0;
    sc.totalCompletedLoads += 1;
    sc.totalRevenue = Number(sc.totalRevenue) + revenue;

    if (!payload.onTime) {
      // Decay on-time % slightly
      sc.onTimeDeliveryPct = ((sc.onTimeDeliveryPct * (sc.totalCompletedLoads - 1)) + 0) / sc.totalCompletedLoads;
    }

    if (payload.rating) {
      sc.totalRatings += 1;
      sc.averageRating = ((sc.averageRating * (sc.totalRatings - 1)) + payload.rating) / sc.totalRatings;
    }

    this.recalculateScore(sc);
    await this.scorecardRepo.save(sc);

    this.logger.log(`Scorecard updated for carrier ${payload.carrierId}: score=${sc.overallScore}, tier=${sc.scoreTier}`);
  }

  /** EX-008: Update on bid placed */
  @OnEvent('bid.placed')
  async onBidPlaced(payload: { carrierId: string; responseTimeMinutes?: number }) {
    const sc = await this.getOrCreate(payload.carrierId);
    sc.totalBidsPlaced += 1;

    if (payload.responseTimeMinutes != null) {
      const prevTotal = sc.totalBidsPlaced - 1;
      sc.avgResponseTimeMinutes = prevTotal > 0
        ? Math.round(((sc.avgResponseTimeMinutes * prevTotal) + payload.responseTimeMinutes) / sc.totalBidsPlaced)
        : payload.responseTimeMinutes;
    }

    await this.scorecardRepo.save(sc);
  }

  /** EX-008: Update on bid accepted/rejected */
  @OnEvent('bid.accepted')
  async onBidAccepted(payload: { carrierId: string }) {
    const sc = await this.getOrCreate(payload.carrierId);
    sc.totalBidsAccepted += 1;
    this.recalculateScore(sc);
    await this.scorecardRepo.save(sc);
  }

  @OnEvent('bid.rejected')
  async onBidRejected(payload: { carrierId: string }) {
    const sc = await this.getOrCreate(payload.carrierId);
    sc.totalBidsRejected += 1;
    this.recalculateScore(sc);
    await this.scorecardRepo.save(sc);
  }

  /** EX-008: Update on bid cancelled by carrier */
  @OnEvent('bid.cancelled')
  async onBidCancelled(payload: { carrierId: string }) {
    const sc = await this.getOrCreate(payload.carrierId);
    const totalDecisions = sc.totalBidsAccepted + sc.totalBidsRejected + 1;
    sc.cancellationRate = ((sc.cancellationRate * (totalDecisions - 1)) + 100) / totalDecisions;
    this.recalculateScore(sc);
    await this.scorecardRepo.save(sc);
  }

  /** EX-008: Update on dispute */
  @OnEvent('dispute.opened')
  async onDisputeOpened(payload: { carrierId: string }) {
    const sc = await this.getOrCreate(payload.carrierId);
    sc.totalDisputes += 1;
    sc.totalClaims += 1;
    sc.claimsRatio = sc.totalCompletedLoads > 0
      ? (sc.totalClaims / sc.totalCompletedLoads) * 100
      : 0;
    this.recalculateScore(sc);
    await this.scorecardRepo.save(sc);
  }

  /** Core scoring algorithm */
  private recalculateScore(sc: CarrierScorecard) {
    // Weight distribution:
    //   On-time delivery: 30%
    //   Claims ratio (inverted): 25%
    //   Cancellation rate (inverted): 15%
    //   Response time: 10%
    //   Rating: 10%
    //   Acceptance rate: 10%

    const onTimeScore = sc.onTimeDeliveryPct * 0.30;
    const claimsScore = Math.max(0, 100 - sc.claimsRatio) * 0.25;
    const cancelScore = Math.max(0, 100 - sc.cancellationRate) * 0.15;

    // Response time: <5min=100, <15min=80, <30min=60, <60min=40, else 20
    let responseScore = 20;
    if (sc.avgResponseTimeMinutes <= 5) responseScore = 100;
    else if (sc.avgResponseTimeMinutes <= 15) responseScore = 80;
    else if (sc.avgResponseTimeMinutes <= 30) responseScore = 60;
    else if (sc.avgResponseTimeMinutes <= 60) responseScore = 40;
    const responseComponent = responseScore * 0.10;

    const ratingComponent = (sc.averageRating / 5) * 100 * 0.10;

    const acceptanceRate = sc.totalBidsPlaced > 0
      ? (sc.totalBidsAccepted / sc.totalBidsPlaced) * 100
      : 50;
    const acceptanceComponent = acceptanceRate * 0.10;

    sc.overallScore = Math.round(
      onTimeScore + claimsScore + cancelScore + responseComponent + ratingComponent + acceptanceComponent,
    );

    // Determine tier
    if (sc.overallScore >= 80) sc.scoreTier = ScoreTier.EXCELLENT;
    else if (sc.overallScore >= 60) sc.scoreTier = ScoreTier.GOOD;
    else if (sc.overallScore >= 40) sc.scoreTier = ScoreTier.FAIR;
    else sc.scoreTier = ScoreTier.AT_RISK;

    // EX-008: Apply restrictions
    if (sc.overallScore < 60) {
      sc.escrowRequired = true;
      if (sc.overallScore < 40) {
        sc.bidLimitPerDay = 5;
        sc.isRestricted = true;
      } else {
        sc.bidLimitPerDay = 0;
        sc.isRestricted = false;
      }
    } else {
      sc.escrowRequired = false;
      sc.bidLimitPerDay = 0;
      sc.isRestricted = false;
    }
  }

  /** Get scorecard with tier info for external display */
  async getScorecard(carrierId: string) {
    const sc = await this.getOrCreate(carrierId);
    return {
      carrierId: sc.carrierId,
      overallScore: sc.overallScore,
      scoreTier: sc.scoreTier,
      tierLabel: this.getTierLabel(sc.scoreTier),
      tierColor: this.getTierColor(sc.scoreTier),
      metrics: {
        onTimeDeliveryPct: sc.onTimeDeliveryPct,
        claimsRatio: sc.claimsRatio,
        cancellationRate: sc.cancellationRate,
        avgResponseTimeMinutes: sc.avgResponseTimeMinutes,
        totalCompletedLoads: sc.totalCompletedLoads,
        totalRevenue: Number(sc.totalRevenue),
        averageRating: sc.averageRating,
        totalRatings: sc.totalRatings,
        acceptanceRate: sc.totalBidsPlaced > 0
          ? Math.round((sc.totalBidsAccepted / sc.totalBidsPlaced) * 100)
          : 0,
      },
      restrictions: {
        escrowRequired: sc.escrowRequired,
        bidLimitPerDay: sc.bidLimitPerDay,
        isRestricted: sc.isRestricted,
      },
    };
  }

  /** Get minimal score info for embedding in bid responses */
  async getBidderScore(carrierId: string) {
    const sc = await this.getOrCreate(carrierId);
    return {
      overallScore: sc.overallScore,
      scoreTier: sc.scoreTier,
      tierLabel: this.getTierLabel(sc.scoreTier),
      tierColor: this.getTierColor(sc.scoreTier),
      escrowRequired: sc.escrowRequired,
      totalCompletedLoads: sc.totalCompletedLoads,
    };
  }

  /** Get leaderboard of top carriers */
  async getLeaderboard(limit = 20) {
    const scorecards = await this.scorecardRepo.find({
      order: { overallScore: 'DESC' },
      take: limit,
    });
    return scorecards.map(sc => ({
      carrierId: sc.carrierId,
      overallScore: sc.overallScore,
      scoreTier: sc.scoreTier,
      tierLabel: this.getTierLabel(sc.scoreTier),
      totalCompletedLoads: sc.totalCompletedLoads,
      totalRevenue: Number(sc.totalRevenue),
    }));
  }

  private getTierLabel(tier: ScoreTier): string {
    switch (tier) {
      case ScoreTier.EXCELLENT: return 'Mükemmel';
      case ScoreTier.GOOD: return 'İyi';
      case ScoreTier.FAIR: return 'Orta';
      case ScoreTier.AT_RISK: return 'Riskli';
    }
  }

  private getTierColor(tier: ScoreTier): string {
    switch (tier) {
      case ScoreTier.EXCELLENT: return '#10B981'; // green
      case ScoreTier.GOOD: return '#F59E0B';      // amber
      case ScoreTier.FAIR: return '#F97316';       // orange
      case ScoreTier.AT_RISK: return '#EF4444';    // red
    }
  }
}
