import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Load, LoadStatus } from './load.entity';
import { User, UserRole } from '../users/user.entity';
import { Notification, NotificationType } from '../notifications/notification.entity';
import { calculateDistance } from '../common/distance';

interface CarrierMatch {
  carrierId: string;
  matchScore: number;
  vehicleMatch: number;
  distanceEff: number;
  emptyKm: number;
  loadId: string;
}

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(
    @InjectRepository(Load)
    private loadRepo: Repository<Load>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Notification)
    private notifRepo: Repository<Notification>,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * EX-007: When a new load is created, find matching carriers
   * and send push notifications for high-match loads (score ≥ 70%)
   */
  @OnEvent('load.created')
  async onLoadCreated(payload: {
    loadId: string;
    loadNo: string;
    loadType: string;
    fromCity: string;
    toCity: string;
    creatorId: string;
  }) {
    try {
      const load = await this.loadRepo.findOne({ where: { id: payload.loadId } });
      if (!load || load.status !== LoadStatus.BEKLEMEDE) return;

      // Find all active carriers with vehicle profiles
      const carriers = await this.userRepo.find({
        where: [
          { role: UserRole.TASIYICI, isActive: true },
          { role: UserRole.SOFOR, isActive: true },
        ],
        take: 100,
      });

      const matches: CarrierMatch[] = [];

      for (const carrier of carriers) {
        if (carrier.id === payload.creatorId) continue;

        const matchResult = this.calculateMatch(load, carrier);
        if (matchResult.matchScore >= 50) {
          // Score ≥50% gets a notification
          matches.push(matchResult);
        }
      }

      // Sort by match score descending
      matches.sort((a, b) => b.matchScore - a.matchScore);

      // Notify top 5 matching carriers
      const topMatches = matches.slice(0, 5);
      for (const match of topMatches) {
        const notif = this.notifRepo.create({
          userId: match.carrierId,
          title: '🔔 Sana Uygun Yeni Yük!',
          message: `${payload.fromCity} → ${payload.toCity} hattında aracına %${match.matchScore} uyumlu yeni bir yük var. Boş KM: ${match.emptyKm}`,
          type: NotificationType.NEW_LOAD_MATCH,
          isRead: false,
          data: {
            loadId: match.loadId,
            matchScore: match.matchScore,
            fromCity: payload.fromCity,
            toCity: payload.toCity,
            emptyKm: match.emptyKm,
          },
        });
        await this.notifRepo.save(notif as any);

        this.eventEmitter.emit('notification.created', {
          userId: match.carrierId,
          notificationId: notif.id,
          loadId: match.loadId,
          matchScore: match.matchScore,
        });

        // WS event for real-time delivery
        this.eventEmitter.emit('new_matching_load', {
          carrierId: match.carrierId,
          loadId: match.loadId,
          matchScore: match.matchScore,
          fromCity: payload.fromCity,
          toCity: payload.toCity,
        });
      }

      if (topMatches.length > 0) {
        this.logger.log(
          `Load ${payload.loadNo}: Notified ${topMatches.length} matching carriers (top score: %${topMatches[0]?.matchScore})`,
        );
      }
    } catch (err) {
      this.logger.error(`Matching notification failed: ${err.message}`);
    }
  }

  /**
   * EX-007: Smatch formula per carrier-load pair
   * Smatch = (w1 × vehicle match) + (w2 × distance efficiency) + (w3 × earnings)
   * Returns matchScore 0-100
   */
  calculateMatch(load: Load, carrier: User): CarrierMatch {
    // 1. Vehicle compatibility (35%)
    let vehicleMatch = 0.5;
    if (carrier.vehicleType && load.vehicleType) {
      const cv = carrier.vehicleType.toLocaleLowerCase('tr-TR');
      const lv = load.vehicleType.toLocaleLowerCase('tr-TR');
      if (cv === lv || lv.includes(cv) || cv.includes(lv)) {
        vehicleMatch = 1.0;
      } else {
        vehicleMatch = 0.2;
      }
    }

    // 2. Distance efficiency (25%) — how close is carrier's last known position?
    let distanceEff = 0.5;
    let emptyKm = 0;
    // Using default Istanbul coordinates if no GPS data available
    const carrierLat = (carrier as any).lastLatitude || 41.0;
    const carrierLng = (carrier as any).lastLongitude || 29.0;
    if (load.pickupLatitude && load.pickupLongitude) {
      emptyKm = calculateDistance(carrierLat, carrierLng, load.pickupLatitude, load.pickupLongitude);
      distanceEff = Math.max(0, Math.min(1, 1 - (emptyKm / 200)));
    }

    // 3. Capacity compatibility (25%)
    let capacityMatch = 0.5;
    if (carrier.tonnageCapacity && (load as any).totalTonnage) {
      capacityMatch = carrier.tonnageCapacity >= (load as any).totalTonnage ? 1.0 : 0.2;
    }
    if (carrier.volumeCapacity && load.volume) {
      const volMatch = carrier.volumeCapacity >= load.volume ? 1.0 : 0.2;
      capacityMatch = (capacityMatch + volMatch) / 2;
    }

    // 4. Earnings potential (15%)
    const price = load.totalPrice || 0;
    let earningsRatio = 0.5;
    if (price > 0 && emptyKm > 0) {
      const effectiveRate = price / Math.max(emptyKm + (load.routeDistance || 300), 1);
      earningsRatio = Math.min(1, effectiveRate / 45);
    }

    // Weighted final score
    const w1 = 0.35, w2 = 0.25, w3 = 0.25, w4 = 0.15;
    const matchScore = Math.round(
      (w1 * vehicleMatch + w2 * distanceEff + w3 * capacityMatch + w4 * earningsRatio) * 100,
    );

    return {
      carrierId: carrier.id,
      matchScore: Math.min(100, Math.max(0, matchScore)),
      vehicleMatch: Math.round(vehicleMatch * 100),
      distanceEff: Math.round(distanceEff * 100),
      emptyKm: Math.round(emptyKm),
      loadId: load.id,
    };
  }
}
