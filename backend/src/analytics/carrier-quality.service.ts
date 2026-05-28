import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { CarrierScorecard, ScoreTier } from './carrier-scorecard.entity';
import { CarrierBadge, BadgeType } from './carrier-badge.entity';

// Ağırlıklar (toplam 100)
const W_SAFETY = 30;       // Hasar oranı, claims
const W_PERFORMANCE = 25;  // Zamanında teslim, hız
const W_RELIABILITY = 20;  // İptal oranı, yanıt süresi
const W_FINANCIAL = 15;   // Gelir, işlem hacmi
const W_RATING = 10;       // Müşteri puanı

@Injectable()
export class CarrierQualityService {
  private readonly logger = new Logger(CarrierQualityService.name);

  constructor(
    @InjectRepository(CarrierScorecard) private scorecardRepo: Repository<CarrierScorecard>,
    @InjectRepository(CarrierBadge) private badgeRepo: Repository<CarrierBadge>,
  ) {}

  /** Teslimat tamamlandığında skoru güncelle */
  @OnEvent('shipment.completed', { async: true })
  async onShipmentCompleted(payload: { carrierId: string; onTime?: boolean; hasDamage?: boolean; rating?: number }) {
    await this.updateScore(payload.carrierId, {
      completed: true,
      onTime: payload.onTime !== false,
      hasDamage: payload.hasDamage || false,
      rating: payload.rating || 0,
    });
  }

  /** Teklif olaylarında skoru güncelle */
  @OnEvent('bid.accepted', { async: true })
  async onBidAccepted(payload: { carrierId: string }) {
    await this.updateScore(payload.carrierId, { bidAccepted: true });
  }

  @OnEvent('bid.rejected', { async: true })
  async onBidRejected(payload: { carrierId: string }) {
    await this.updateScore(payload.carrierId, { bidRejected: true });
  }

  /** Ana skor güncelleme */
  private async updateScore(carrierId: string, event: {
    completed?: boolean; onTime?: boolean; hasDamage?: boolean;
    rating?: number; bidAccepted?: boolean; bidRejected?: boolean;
  }) {
    let card = await this.scorecardRepo.findOne({ where: { carrierId } });
    if (!card) card = this.scorecardRepo.create({ carrierId });

    if (event.completed) {
      card.totalCompletedLoads = (card.totalCompletedLoads || 0) + 1;
      if (event.onTime) card.onTimeDeliveryPct = this.recalcPct(card.onTimeDeliveryPct, card.totalCompletedLoads, true);
      else card.onTimeDeliveryPct = this.recalcPct(card.onTimeDeliveryPct, card.totalCompletedLoads, false);
      if (event.hasDamage) {
        card.totalClaims = (card.totalClaims || 0) + 1;
        card.claimsRatio = Math.round((card.totalClaims / card.totalCompletedLoads) * 100);
      }
      if (event.rating && event.rating > 0) {
        card.totalRatings = (card.totalRatings || 0) + 1;
        card.averageRating = ((card.averageRating || 0) * (card.totalRatings - 1) + (event.rating || 0)) / card.totalRatings;
      }
    }

    if (event.bidAccepted) card.totalBidsAccepted = (card.totalBidsAccepted || 0) + 1;
    if (event.bidRejected) card.totalBidsRejected = (card.totalBidsRejected || 0) + 1;

    // Overall score hesapla (5 boyutlu)
    const safety = 100 - (card.claimsRatio || 0);                                    // %30
    const performance = card.onTimeDeliveryPct || 100;                                // %25
    const reliability = Math.max(0, 100 - ((card.cancellationRate || 0) * 2));       // %20
    const financial = Math.min(100, ((card.totalCompletedLoads || 0) / 50) * 100);   // %15
    const rating = (card.averageRating || 5) * 20;                                   // %10

    card.overallScore = Math.round(
      safety * 0.30 + performance * 0.25 + reliability * 0.20 + financial * 0.15 + rating * 0.10
    );

    // Tier belirle
    if (card.overallScore >= 80) card.scoreTier = ScoreTier.EXCELLENT;
    else if (card.overallScore >= 60) card.scoreTier = ScoreTier.GOOD;
    else if (card.overallScore >= 40) card.scoreTier = ScoreTier.FAIR;
    else card.scoreTier = ScoreTier.AT_RISK;

    // Kısıtlamalar
    card.escrowRequired = card.overallScore < 60;
    card.isRestricted = card.overallScore < 30;
    card.bidLimitPerDay = card.overallScore < 40 ? 3 : 0;

    await this.scorecardRepo.save(card);

    // Rozet kontrolü
    await this.checkBadges(card);
  }

  /** Rozetleri kontrol et ve hak edilenleri ver */
  private async checkBadges(card: CarrierScorecard) {
    const badges: Array<{ type: BadgeType; name: string; icon: string; desc: string }> = [];

    if (card.overallScore >= 85 && card.totalCompletedLoads >= 20)
      badges.push({ type: BadgeType.GOLD, name: 'Altın Taşıyıcı', icon: '🥇', desc: '85+ skor, 20+ yük' });
    else if (card.overallScore >= 70 && card.totalCompletedLoads >= 10)
      badges.push({ type: BadgeType.SILVER, name: 'Gümüş Taşıyıcı', icon: '🥈', desc: '70+ skor, 10+ yük' });
    else if (card.overallScore >= 55 && card.totalCompletedLoads >= 5)
      badges.push({ type: BadgeType.BRONZE, name: 'Bronz Taşıyıcı', icon: '🥉', desc: '55+ skor, 5+ yük' });

    if (card.onTimeDeliveryPct >= 95 && card.totalCompletedLoads >= 5)
      badges.push({ type: BadgeType.SPEED, name: 'Hızlı Teslimatçı', icon: '⚡', desc: '%95+ zamanında teslim' });

    if (card.claimsRatio < 5 && card.totalCompletedLoads >= 10)
      badges.push({ type: BadgeType.RELIABLE, name: 'Güvenilir Şoför', icon: '🛡️', desc: '%5 altı hasar oranı' });

    if (card.totalCompletedLoads >= 50)
      badges.push({ type: BadgeType.VOLUME, name: 'Yüksek Hacimli Taşıyıcı', icon: '📦', desc: '50+ tamamlanan yük' });

    for (const b of badges) {
      const exists = await this.badgeRepo.findOne({ where: { carrierId: card.carrierId, type: b.type } });
      if (!exists) {
        await this.badgeRepo.save(this.badgeRepo.create({ carrierId: card.carrierId, ...b }));
        this.logger.log(`🏅 Rozet verildi: ${b.name} → ${card.carrierId}`);
      }
    }
  }

  private recalcPct(current: number, total: number, success: boolean): number {
    if (total <= 1) return success ? 100 : 0;
    const oldSuccess = (current / 100) * (total - 1);
    return Math.round(((oldSuccess + (success ? 1 : 0)) / total) * 100);
  }

  /** Taşıyıcı detaylı skor kartı */
  async getScorecard(carrierId: string) {
    const card = await this.scorecardRepo.findOne({ where: { carrierId } });
    const badges = await this.badgeRepo.find({ where: { carrierId }, order: { earnedAt: 'DESC' } });
    if (!card) return { overallScore: 50, scoreTier: 'good', badges: [], isNew: true };

    return {
      ...card,
      tierLabel: card.scoreTier === ScoreTier.EXCELLENT ? 'Mükemmel' :
                 card.scoreTier === ScoreTier.GOOD ? 'İyi' :
                 card.scoreTier === ScoreTier.FAIR ? 'Orta' : 'Riskli',
      tierColor: card.scoreTier === ScoreTier.EXCELLENT ? '#10B981' :
                 card.scoreTier === ScoreTier.GOOD ? '#3B82F6' :
                 card.scoreTier === ScoreTier.FAIR ? '#F59E0B' : '#EF4444',
      badges,
      scoreBreakdown: {
        safety: Math.round(100 - (card.claimsRatio || 0)),
        performance: card.onTimeDeliveryPct || 100,
        reliability: Math.max(0, 100 - ((card.cancellationRate || 0) * 2)),
        financial: Math.min(100, ((card.totalCompletedLoads || 0) / 50) * 100),
        rating: (card.averageRating || 5) * 20,
      },
      restrictions: {
        escrowRequired: card.escrowRequired,
        bidLimitPerDay: card.bidLimitPerDay,
        isRestricted: card.isRestricted,
      },
    };
  }

  /** En iyi taşıyıcılar (liderlik tablosu) */
  async getLeaderboard(limit = 20) {
    return this.scorecardRepo
      .createQueryBuilder('c')
      .where('c.totalCompletedLoads > 0')
      .orderBy('c.overallScore', 'DESC')
      .limit(limit)
      .getMany();
  }

  async filterCarriersByScore(minScore: number) {
    return this.scorecardRepo
      .createQueryBuilder('c')
      .where('c.overallScore >= :min', { min: minScore })
      .orderBy('c.overallScore', 'DESC')
      .getMany();
  }
}
