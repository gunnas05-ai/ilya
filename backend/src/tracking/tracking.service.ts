import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TrackingRecord } from './tracking.entity';
import { DeliveryVerification } from './delivery-verification.entity';

import { WebSocketGateway } from '../websocket/websocket.gateway';
import { Load } from '../loads/load.entity';
import { calculateDistance } from '../common/distance';
import { ReturnLoadsService } from '../return-loads/return-loads.service';

@Injectable()
export class TrackingService {
  constructor(
    @InjectRepository(TrackingRecord)
    private trackingRepo: Repository<TrackingRecord>,
    @InjectRepository(DeliveryVerification)
    private verificationRepo: Repository<DeliveryVerification>,
    @InjectRepository(Load)
    private loadRepo: Repository<Load>,
    private wsGateway: WebSocketGateway,
    private returnLoadsService: ReturnLoadsService,
    private eventEmitter: EventEmitter2,
  ) {}

  async recordLocation(data: {
    loadId: string;
    driverId: string;
    latitude: number;
    longitude: number;
    speed?: number;
    heading?: number;
    accuracy?: number;
    label?: string;
  }) {
    const record = this.trackingRepo.create(data);
    const savedRecord = await this.trackingRepo.save(record);

    // Calculate Live ETA
    try {
      const load = await this.loadRepo.findOne({ where: { id: data.loadId } });
      if (load && load.deliveryLatitude && load.deliveryLongitude) {
        const distanceKm = calculateDistance(
          data.latitude,
          data.longitude,
          load.deliveryLatitude,
          load.deliveryLongitude
        );
        
        // Assume avg speed 70 km/h for trucks if speed is 0 or undefined
        const avgSpeed = (data.speed && data.speed > 10) ? data.speed : 70;
        const hoursRemaining = distanceKm / avgSpeed;
        
        const now = new Date();
        now.setMinutes(now.getMinutes() + Math.round(hoursRemaining * 60));
        
        const liveETA = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) + 
                        (hoursRemaining > 24 ? ` (${now.toLocaleDateString('tr-TR')})` : '');
        
        await this.loadRepo.update(data.loadId, { liveETA });
        
        // Broadcast via WS
        this.wsGateway.broadcastToAll(`TRACKING_UPDATE_${data.loadId}`, {
          latitude: data.latitude,
          longitude: data.longitude,
          speed: data.speed,
          heading: data.heading,
          liveETA,
          distanceRemainingKm: Math.round(distanceKm),
        });
      }
    } catch (err) {
      console.error('Error calculating ETA:', err);
    }

    return savedRecord;
  }

  async getTrackingHistory(loadId: string, limit = 100) {
    return this.trackingRepo.find({
      where: { loadId },
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }

  async getLatestPosition(loadId: string) {
    return this.trackingRepo.findOne({
      where: { loadId },
      order: { timestamp: 'DESC' },
    });
  }

  async getTrackingByDriver(driverId: string) {
    return this.trackingRepo.find({
      where: { driverId },
      order: { timestamp: 'DESC' },
      take: 50,
    });
  }

  // ======= Share Tracking =======

  async generateShareLink(loadId: string) {
    const load = await this.loadRepo.findOne({ where: { id: loadId } });
    if (!load) throw new NotFoundException('Yuk bulunamadi');
    const latest = await this.getLatestPosition(loadId);
    const shareUrl = `https://kaptan.app/track/${loadId}`;
    return {
      shareUrl,
      load: { title: load.title, from: load.fromCity, to: load.toCity },
      current: latest ? { lat: latest.latitude, lng: latest.longitude, speed: latest.speed, updatedAt: latest.timestamp } : null,
      eta: load.liveETA || 'Hesaplanıyor...',
    };
  }

  async getActiveShipments(limit = 50) {
    const records = await this.trackingRepo
      .createQueryBuilder('t')
      .select('DISTINCT ON (t.loadId) t.*')
      .orderBy('t.loadId')
      .addOrderBy('t.timestamp', 'DESC')
      .limit(limit)
      .getMany();
    return records;
  }

  // ======= Delivery Verification =======

  async verifyDelivery(data: {
    loadId: string;
    driverId: string;
    method: 'qr' | 'photo' | 'otp' | 'gps';
    metadata?: any;
  }) {
    const verification = this.verificationRepo.create({
      loadId: data.loadId,
      driverId: data.driverId,
      method: data.method,
      metadata: data.metadata || {},
    });
    const savedVerification = await this.verificationRepo.save(verification);

    // Emit shipment.completed → AutomatedReloadsService + AI Matching
    try {
      const load = await this.loadRepo.findOne({ where: { id: data.loadId } });
      if (load) {
        // Event: Otomatik Backhaul tetikleme
        this.eventEmitter.emit('shipment.completed', {
          shipmentId: data.loadId,
          loadTitle: load.title || 'Sevkiyat',
          fromCity: load.fromCity || '',
          toCity: load.toCity || '',
          carrierId: data.driverId,
          carrierName: data.metadata?.driverName || 'Taşıyıcı',
          deliveryLat: load.deliveryLatitude || 0,
          deliveryLng: load.deliveryLongitude || 0,
          deliveredAt: new Date(),
          vehicleType: load.vehicleType,
          tonnageCapacity: load.totalWeight,
          volumeCapacity: load.volume,
        });
      }

      if (load && load.deliveryLatitude && load.deliveryLongitude) {
        // WebSocket: Anlık backhaul bildirimi (mevcut yapı)
        const backhaul = await this.returnLoadsService.searchReturnLoads({
          deliveryLatitude: load.deliveryLatitude,
          deliveryLongitude: load.deliveryLongitude,
          radiusKm: 100,
          carrierVehicleType: load.vehicleType,
          carrierTonnageCapacity: load.totalWeight,
          deliveryCompletedAt: new Date(),
        });

        if (backhaul && backhaul.loads && backhaul.loads.length > 0) {
          const topLoads = backhaul.loads.slice(0, 5);
          const totalEarnings = topLoads.reduce((s: number, m: any) => s + (Number(m.load?.totalPrice) || 0), 0);

          // AUTOMATED_RELOAD event'i (yeni sistem)
          this.wsGateway.sendToUser(data.driverId, 'AUTOMATED_RELOAD', {
            bundleId: `auto-${data.loadId}`,
            backhaulCount: topLoads.length,
            totalEarnings,
            emptyKmSaved: topLoads.reduce((s: number, m: any) => s + (m.estimatedRoadKm || 0), 0),
            expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            message: `🎯 Boşaltma noktana 100km yakında ${topLoads.length} yük var! ${Number(totalEarnings).toLocaleString('tr-TR')} ₺ ek kazanç. Rezerve etmek ister misin?`,
            backhaulLoads: topLoads.map(m => ({
              loadId: m.load.id,
              title: m.load.title,
              fromCity: m.load.fromCity,
              toCity: m.load.toCity,
              price: Number(m.load.totalPrice) || 0,
              distance: m.estimatedRoadKm || 0,
              matchScore: m.compatibilityScore,
              escrowEnabled: !!(m.load as any).escrowEnabled,
            })),
            deliveryLat: load.deliveryLatitude,
            deliveryLng: load.deliveryLongitude,
          });

          // Eski notification event'i (geriye dönük uyumluluk)
          this.wsGateway.broadcastToAll(`USER_NOTIFICATION_${data.driverId}`, {
            title: '🎯 Geri Dönüş Yükü Bulundu!',
            message: `Boşaltma noktana 100km çapta ${backhaul.loads.length} adet uygun geri dönüş yükü var. ${Number(totalEarnings).toLocaleString('tr-TR')} ₺ ek kazanç fırsatı!`,
            type: 'AUTOMATED_RELOAD',
            actionUrl: `/return-loads?lat=${load.deliveryLatitude}&lng=${load.deliveryLongitude}`,
            data: {
              backhaulCount: topLoads.length,
              totalEarnings,
              loads: topLoads.slice(0, 3).map(m => ({ id: m.load.id, title: m.load.title, price: Number(m.load.totalPrice) || 0 })),
            }
          });
        }
      }
    } catch (err) {
      console.error('Error triggering backhaul matching:', err);
    }

    return savedVerification;
  }

  async getDeliveryVerification(loadId: string) {
    return this.verificationRepo.find({
      where: { loadId },
      order: { verifiedAt: 'DESC' },
    });
  }

  async isDeliveryVerified(loadId: string): Promise<boolean> {
    const count = await this.verificationRepo.count({
      where: { loadId },
    });
    return count > 0;
  }
}
