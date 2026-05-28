import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { CarrierPreference } from './carrier-preference.entity';
import { MatchingFeedback, FeedbackAction } from './matching-feedback.entity';

@Injectable()
export class AiMatchingService {
  private readonly logger = new Logger(AiMatchingService.name);

  constructor(
    @InjectRepository(CarrierPreference) private prefRepo: Repository<CarrierPreference>,
    @InjectRepository(MatchingFeedback) private feedbackRepo: Repository<MatchingFeedback>,
  ) {}

  /** Kayıtlı preference yoksa boş profil oluştur */
  async getCarrierPreference(carrierId: string) {
    let pref = await this.prefRepo.findOne({ where: { carrierId } });
    if (!pref) {
      pref = this.prefRepo.create({ carrierId });
      pref = await this.prefRepo.save(pref);
    }
    return pref;
  }

  /** Geri bildirim kaydet ve preference'ları güncelle */
  async recordFeedback(data: {
    carrierId: string; loadId: string; loadTitle: string;
    fromCity: string; toCity: string; loadType?: string;
    loadPrice?: number; loadDistance?: number; vehicleType?: string;
    action: FeedbackAction; matchScore?: number; source?: string;
  }) {
    await this.feedbackRepo.save(this.feedbackRepo.create({ ...data } as any));
    await this.updatePreferences(data.carrierId, data);
    return { success: true };
  }

  /** Geri bildirim geçmişi */
  async getFeedbackHistory(carrierId: string, limit = 50) {
    return this.feedbackRepo.find({ where: { carrierId }, order: { createdAt: 'DESC' }, take: limit });
  }

  /** Taşıyıcıya özel skor hesapla (dışarıdan yük listesi alır) */
  scoreLoadsForCarrier(loads: any[], carrierId: string, pref?: CarrierPreference | null): Array<{ load: any; score: number; reasons: string }> {
    return loads.map(load => {
      const { score, reasons } = this.calculatePersonalizedScore(load, pref || null);
      return { load, score, reasons };
    }).sort((a, b) => b.score - a.score);
  }

  private calculatePersonalizedScore(load: any, pref: CarrierPreference | null): { score: number; reasons: string } {
    const reasons: string[] = [];
    let totalScore = 0;

    const routeScore = this.scoreRoutePreference(load, pref);
    totalScore += routeScore * 0.30;
    if (routeScore > 70) reasons.push('Tercih ettiğiniz rotada');

    const priceScore = this.scorePriceMatch(load, pref);
    totalScore += priceScore * 0.25;
    if (priceScore > 70) reasons.push('Bütçenize uygun fiyat');

    const typeScore = this.scoreLoadTypePreference(load, pref);
    totalScore += typeScore * 0.15;
    if (typeScore > 70) reasons.push('Tercih ettiğiniz yük tipi');

    const distanceScore = this.scoreDistanceMatch(load, pref);
    totalScore += distanceScore * 0.15;
    if (distanceScore > 70) reasons.push('İdeal mesafe aralığında');

    const timeScore = this.scoreTimeMatch(load);
    totalScore += timeScore * 0.10;

    const vehicleScore = this.scoreVehicleMatch(load, pref);
    totalScore += vehicleScore * 0.05;
    if (vehicleScore === 100) reasons.push('Aracınıza tam uyumlu');

    if (load.escrowEnabled) { totalScore += 5; reasons.push('Escrow güvencesi var'); }

    return {
      score: Math.round(Math.min(100, totalScore)),
      reasons: reasons.slice(0, 3).join(' • ') || 'Genel eşleşme',
    };
  }

  private scoreRoutePreference(load: any, pref: CarrierPreference | null): number {
    if (!pref?.favoriteRoutes?.length) return 50;
    const match = pref.favoriteRoutes.find(r => r.fromCity === load.fromCity && r.toCity === load.toCity);
    if (!match) return 30;
    return Math.min(100, 50 + match.count * 5);
  }

  private scorePriceMatch(load: any, pref: CarrierPreference | null): number {
    if (!pref?.avgAcceptedPrice) return 50;
    const price = Number(load.totalPrice) || 0;
    if (price === 0) return 50;
    const ratio = price / pref.avgAcceptedPrice;
    if (ratio >= 0.8 && ratio <= 1.2) return 85;
    if (ratio >= 0.6 && ratio <= 1.5) return 60;
    return 30;
  }

  private scoreLoadTypePreference(load: any, pref: CarrierPreference | null): number {
    if (!pref?.preferredLoadTypes?.length) return 50;
    const match = pref.preferredLoadTypes.find(t => t.loadType === load.loadType);
    if (!match) return 30;
    const total = pref.preferredLoadTypes.reduce((s: number, t: any) => s + t.count, 0);
    return Math.min(100, 50 + (match.count / (total || 1)) * 50);
  }

  private scoreDistanceMatch(load: any, pref: CarrierPreference | null): number {
    if (!pref?.avgPreferredDistance) return 50;
    const dist = Number(load.routeDistance) || 0;
    if (dist === 0) return 50;
    const ratio = dist / pref.avgPreferredDistance;
    if (ratio >= 0.7 && ratio <= 1.3) return 85;
    if (ratio >= 0.4 && ratio <= 2.0) return 60;
    return 35;
  }

  private scoreTimeMatch(load: any): number {
    const age = Date.now() - (load.createdAt ? new Date(load.createdAt).getTime() : Date.now());
    const hours = age / (1000 * 60 * 60);
    if (hours < 1) return 100;
    if (hours < 6) return 85;
    if (hours < 24) return 70;
    if (hours < 72) return 50;
    return 30;
  }

  private scoreVehicleMatch(load: any, pref: CarrierPreference | null): number {
    if (!pref?.preferredVehicleType || !load.vehicleType) return 50;
    return load.vehicleType === pref.preferredVehicleType ? 100 : 30;
  }

  private async updatePreferences(carrierId: string, fb: any) {
    let pref = await this.prefRepo.findOne({ where: { carrierId } });
    if (!pref) pref = this.prefRepo.create({ carrierId });

    if (fb.action === FeedbackAction.ACCEPTED || fb.action === FeedbackAction.BID) {
      const routes = pref.favoriteRoutes || [];
      const existing = routes.find((r: any) => r.fromCity === fb.fromCity && r.toCity === fb.toCity);
      if (existing) { existing.count++; existing.lastUsed = new Date().toISOString(); }
      else routes.push({ fromCity: fb.fromCity, toCity: fb.toCity, count: 1, lastUsed: new Date().toISOString() });
      routes.sort((a: any, b: any) => b.count - a.count);
      pref.favoriteRoutes = routes.slice(0, 20);
    }

    if (fb.loadType) {
      const types = pref.preferredLoadTypes || [];
      const existing = types.find((t: any) => t.loadType === fb.loadType);
      if (existing) existing.count++; else types.push({ loadType: fb.loadType, count: 1 });
      types.sort((a: any, b: any) => b.count - a.count);
      pref.preferredLoadTypes = types;
    }

    if (fb.action === FeedbackAction.ACCEPTED && fb.loadPrice > 0) {
      const n = (pref.totalAccepted || 0) + 1;
      pref.avgAcceptedPrice = ((pref.avgAcceptedPrice || 0) * (n - 1) + fb.loadPrice) / n;
      pref.minAcceptedPrice = Math.min(pref.minAcceptedPrice || Infinity, fb.loadPrice);
      pref.maxAcceptedPrice = Math.max(pref.maxAcceptedPrice || 0, fb.loadPrice);
    }

    if (fb.action === FeedbackAction.ACCEPTED && fb.loadDistance > 0) {
      pref.avgPreferredDistance = ((pref.avgPreferredDistance || 0) * (pref.totalAccepted || 0) + fb.loadDistance) / ((pref.totalAccepted || 0) + 1);
    }

    pref.totalInteractions = (pref.totalInteractions || 0) + 1;
    if (fb.action === FeedbackAction.ACCEPTED) pref.totalAccepted = (pref.totalAccepted || 0) + 1;
    if (fb.action === FeedbackAction.REJECTED) pref.totalRejected = (pref.totalRejected || 0) + 1;
    pref.lastActivityAt = new Date();

    await this.prefRepo.save(pref);
  }

  @Cron('0 */6 * * *')
  async cleanupOldFeedback() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await this.feedbackRepo.createQueryBuilder('f').delete()
      .where('f.action = :action', { action: FeedbackAction.SKIPPED })
      .andWhere('f.createdAt < :date', { date: thirtyDaysAgo.toISOString() }).execute();
  }
}
