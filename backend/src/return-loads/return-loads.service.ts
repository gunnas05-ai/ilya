import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { Load, LoadStatus } from '../loads/load.entity';
import { calculateDistance } from '../common/distance';
import { WebSocketGateway } from '../websocket/websocket.gateway';

export interface ReturnLoadSearchParams {
  deliveryLatitude: number;
  deliveryLongitude: number;
  radiusKm: number;
  carrierVehicleType?: string;
  carrierTonnageCapacity?: number;
  carrierVolumeCapacity?: number;
  deliveryCompletedAt: Date;
}

export interface ReturnLoadResult {
  load: Load;
  distanceKm: number;
  estimatedRoadKm: number;
  emptyKmPenalty: number;
  compatibilityScore: number;
  scoreBreakdown: {
    vehicleMatch: number;
    tonnageMatch: number;
    volumeMatch: number;
    dateMatch: number;
    distanceScore: number;
    routeEfficiency: number;
    earningsRatio: number;
  };
}

@Injectable()
export class ReturnLoadsService {
  constructor(
    @InjectRepository(Load)
    private loadRepo: Repository<Load>,
    private wsGateway: WebSocketGateway,
  ) {}

  async searchReturnLoads(params: ReturnLoadSearchParams): Promise<{
    loads: ReturnLoadResult[];
    total: number;
    searchRadiusKm: number;
    centerLat: number;
    centerLng: number;
  }> {
    const {
      deliveryLatitude,
      deliveryLongitude,
      radiusKm,
      carrierVehicleType,
      carrierTonnageCapacity,
      carrierVolumeCapacity,
      deliveryCompletedAt,
    } = params;

    // Fetch active loads with coordinates
    const candidateLoads = await this.loadRepo.find({
      where: {
        status: LoadStatus.BEKLEMEDE,
        pickupLatitude: MoreThanOrEqual(-90) as any, // has coordinates
      },
    });

    // Filter loads that actually have pickup coordinates
    const validLoads = candidateLoads.filter(
      (l) => l.pickupLatitude != null && l.pickupLongitude != null && l.pickupDate,
    );

    const results: ReturnLoadResult[] = [];

    for (const load of validLoads) {
      // 1. Distance check: is load pickup within radius?
      const distanceKm = calculateDistance(
        deliveryLatitude,
        deliveryLongitude,
        load.pickupLatitude!,
        load.pickupLongitude!,
      );

      if (distanceKm > radiusKm) continue;

      // 2. Vehicle type match (birebir eşleşme zorunlu)
      if (carrierVehicleType && load.vehicleType && load.vehicleType !== carrierVehicleType) {
        continue;
      }

      // 3. Tonaj uyumu: yük taşıyıcı kapasitesini aşmamalı
      const loadWeight = load.totalTonnage || load.totalWeight || 0;
      if (carrierTonnageCapacity && loadWeight > carrierTonnageCapacity) {
        continue;
      }

      // 4. Hacim uyumu
      if (carrierVolumeCapacity && load.volume && load.volume > carrierVolumeCapacity) {
        continue;
      }

      // 5. Tarih uyumu: yükleme teslimattan min 1 saat sonra, max 48 saat içinde
      const pickupDate = new Date(load.pickupDate);
      const minPickup = new Date(deliveryCompletedAt.getTime() + 60 * 60 * 1000); // +1 hour
      const maxPickup = new Date(deliveryCompletedAt.getTime() + 48 * 60 * 60 * 1000); // +48 hours

      if (pickupDate < minPickup || pickupDate > maxPickup) {
        continue;
      }

      // All filters passed - calculate compatibility score
      const roadDistanceFactor = 1.35;
      const estimatedRoadKm = Math.round(distanceKm * roadDistanceFactor * 10) / 10;
      const emptyKmPenalty = Math.min(5, Math.round((distanceKm / radiusKm) * 5));

      const scoreBreakdown = this.calculateScoreBreakdown({
        distanceKm,
        radiusKm,
        vehicleMatch: !carrierVehicleType || !load.vehicleType || load.vehicleType === carrierVehicleType,
        tonnageRatio: carrierTonnageCapacity ? loadWeight / carrierTonnageCapacity : 0,
        volumeRatio: carrierVolumeCapacity && load.volume ? load.volume / carrierVolumeCapacity : 0,
        dateProximity: (pickupDate.getTime() - deliveryCompletedAt.getTime()) / (1000 * 60 * 60), // hours after delivery
        loadPrice: Number(load.totalPrice) || 0,
        estimatedRoadKm,
        emptyKmPenalty,
      });

      const compatibilityScore = Math.min(100, Math.max(0, Math.round(
        Object.values(scoreBreakdown).reduce((a, b) => a + b, 0)
      )));

      results.push({
        load,
        distanceKm: Math.round(distanceKm * 10) / 10,
        estimatedRoadKm,
        emptyKmPenalty,
        compatibilityScore,
        scoreBreakdown,
      });
    }

    // Sort by score descending, then distance ascending
    results.sort((a, b) => {
      if (b.compatibilityScore !== a.compatibilityScore) return b.compatibilityScore - a.compatibilityScore;
      return a.distanceKm - b.distanceKm;
    });

    // WebSocket: notify carrier of matching loads
    if (results.length > 0 && params.carrierVehicleType) {
      // In a real scenario, userId would come from the request context
      // Here we emit via broadcast for any connected user in relevant rooms
      const topLoads = results.slice(0, 3);
      topLoads.forEach((r) => {
        if (r.compatibilityScore >= 70) {
          this.wsGateway.broadcastToAll('NEW_RETURN_LOAD', {
            load: { id: r.load.id, title: r.load.title, fromCity: r.load.fromCity, toCity: r.load.toCity },
            compatibilityScore: r.compatibilityScore,
            distanceKm: r.distanceKm,
          });
        }
      });
    }

    return {
      loads: results.slice(0, 50), // max 50 results
      total: results.length,
      searchRadiusKm: radiusKm,
      centerLat: deliveryLatitude,
      centerLng: deliveryLongitude,
    };
  }

  // ======== Reservation System ========

  async reserveLoad(loadId: string, carrierId: string): Promise<boolean> {
    const load = await this.loadRepo.findOne({ where: { id: loadId } });
    if (!load) throw new NotFoundException('Yük bulunamadı');

    // Check if already reserved by someone else and reservation is still valid
    if (load.reservedById && load.reservedById !== carrierId && load.reservationExpiresAt) {
      if (new Date() < new Date(load.reservationExpiresAt)) {
        throw new ConflictException('Bu yük şu anda başkası tarafından rezerve edilmiş');
      }
    }

    // Atomically reserve (optimistic locking via version check)
    const result = await this.loadRepo.update(
      {
        id: loadId,
        version: load.version, // optimistic lock
      },
      {
        reservedById: carrierId,
        reservedAt: new Date(),
        reservationExpiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min timeout
        version: load.version + 1,
      },
    );

    if (result.affected === 0) {
      throw new ConflictException('Rezervasyon yapılamadı, lütfen tekrar deneyin');
    }

    // Notify other potential bidders
    this.wsGateway.emitLoadReserved(load.creatorId, loadId, carrierId);

    return true;
  }

  async releaseReservation(loadId: string, carrierId: string): Promise<void> {
    const load = await this.loadRepo.findOne({ where: { id: loadId, reservedById: carrierId } });
    if (!load) return;

    await this.loadRepo.update(loadId, {
      reservedById: null,
      reservedAt: null,
      reservationExpiresAt: null,
    });

    this.wsGateway.emitLoadExpired(loadId, `load:${loadId}`);
  }

  @Cron('*/1 * * * *') // every minute
  async expireStaleReservations() {
    const expired = await this.loadRepo
      .createQueryBuilder('load')
      .where('load.reservedById IS NOT NULL')
      .andWhere('load.reservationExpiresAt IS NOT NULL')
      .andWhere('load.reservationExpiresAt < :now', { now: new Date() })
      .getMany();

    for (const load of expired) {
      await this.loadRepo.update(load.id, {
        reservedById: null,
        reservedAt: null,
        reservationExpiresAt: null,
      });
      this.wsGateway.emitLoadExpired(load.id, `load:${load.id}`);
    }
  }

  /**
   * EX-015: Weighted compatibility scoring algorithm ($S_{match}$).
   *
   * S_match = (0.30 × vehicleMatch) + (0.20 × distanceScore) + (0.15 × tonnageMatch)
   *         + (0.10 × volumeMatch) + (0.10 × dateMatch) + (0.10 × routeEfficiency)
   *         + (0.05 × earningsRatio)
   *
   * Empty KM penalty is subtracted from the final raw score to give a
   * small penalty for loads far from the delivery point (incentivises
   * reducing empty mileage).
   *
   * All sub-scores are normalised to 0–100 before weighting.
   */
  private calculateScoreBreakdown(data: {
    distanceKm: number;
    radiusKm: number;
    vehicleMatch: boolean;
    tonnageRatio: number;
    volumeRatio: number;
    dateProximity: number;
    loadPrice: number;
    estimatedRoadKm: number;
    emptyKmPenalty: number;
  }): ReturnLoadResult['scoreBreakdown'] {
    // ── Vehicle (0–100) — binary exact match ──
    const vehicleMatch = data.vehicleMatch ? 100 : 0;

    // ── Distance (0–100) — closer = higher ──
    const distanceScore = Math.max(0, Math.round(100 * (1 - data.distanceKm / data.radiusKm)));

    // ── Tonnage (0–100) — ideal at 50–80% of carrier capacity ──
    let tonnageMatch = 0;
    if (data.tonnageRatio > 0) {
      if (data.tonnageRatio >= 0.5 && data.tonnageRatio <= 0.8) tonnageMatch = 100;
      else if (data.tonnageRatio < 0.5) tonnageMatch = Math.round(100 * (data.tonnageRatio / 0.5));
      else tonnageMatch = Math.round(100 * Math.max(0, (1 - data.tonnageRatio) / 0.2));
    }

    // ── Volume (0–100) — same logic as tonnage ──
    let volumeMatch = 0;
    if (data.volumeRatio > 0) {
      if (data.volumeRatio >= 0.5 && data.volumeRatio <= 0.8) volumeMatch = 100;
      else if (data.volumeRatio < 0.5) volumeMatch = Math.round(100 * (data.volumeRatio / 0.5));
      else volumeMatch = Math.round(100 * Math.max(0, (1 - data.volumeRatio) / 0.2));
    }

    // ── Date (0–100) — ideal at 12–24 hours after delivery ──
    let dateMatch = 0;
    const h = data.dateProximity;
    if (h >= 12 && h <= 24) dateMatch = 100;
    else if (h >= 6 && h < 12) dateMatch = 75;
    else if (h > 24 && h <= 36) dateMatch = 75;
    else if (h >= 1 && h < 6) dateMatch = 50;
    else if (h > 36 && h <= 48) dateMatch = 50;

    // ── Route efficiency (0–100) — pickup close to route = high ──
    let routeEfficiency = 0;
    const ratio = data.distanceKm / data.radiusKm;
    if (ratio <= 0.25) routeEfficiency = 100;
    else if (ratio <= 0.50) routeEfficiency = 75;
    else if (ratio <= 0.75) routeEfficiency = 50;
    else routeEfficiency = 25;

    // ── Earnings ratio (0–100) — load price relative to carrier cost ──
    // Estimated carrier cost per km ~42 TL (fuel) + 15 TL (amortisman) = 57 TL/km
    // Earnings = (loadPrice - roadCost) / loadPrice, capped 0–1
    let earningsRatio = 0;
    if (data.loadPrice > 0 && data.estimatedRoadKm > 0) {
      const costPerKm = 57; // TL/km (fuel + amortisman)
      const roadCost = data.estimatedRoadKm * costPerKm;
      const margin = (data.loadPrice - roadCost) / data.loadPrice;
      earningsRatio = Math.max(0, Math.min(100, Math.round(margin * 100)));
    }

    // Return ALL sub-scores in 0–100 scale
    return { vehicleMatch, tonnageMatch, volumeMatch, dateMatch, distanceScore, routeEfficiency, earningsRatio };
  }
}
