import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { Cron } from '@nestjs/schedule';
import { ReloadBundle, BundleStatus } from './reload-bundle.entity';
import { ReturnLoadsService } from '../return-loads/return-loads.service';
import { WebSocketGateway } from '../websocket/websocket.gateway';

const RADIUS_KM = 250;
const EXPIRE_MINUTES = 15;
const MAX_BACKHAUL_LOADS = 5;
const MIN_MATCH_SCORE = 20;

@Injectable()
export class AutomatedReloadsService {
  private readonly logger = new Logger(AutomatedReloadsService.name);

  constructor(
    @InjectRepository(ReloadBundle) private bundleRepo: Repository<ReloadBundle>,
    private returnLoadsService: ReturnLoadsService,
    private wsGateway: WebSocketGateway,
  ) {}

  @OnEvent('shipment.completed', { async: true })
  async onShipmentCompleted(payload: {
    shipmentId: string; loadTitle: string; fromCity: string; toCity: string;
    carrierId: string; carrierName: string; deliveryLat: number; deliveryLng: number;
    deliveredAt: Date; vehicleType?: string; tonnageCapacity?: number; volumeCapacity?: number;
  }) {
    this.logger.log(`🔄 Otomatik backhaul: ${payload.shipmentId}`);
    try {
      const bundle = await this.generateReloadBundle(payload);
      if (bundle) {
        await this.notifyCarrier(bundle);
        this.logger.log(`✅ ${bundle.backhaulLoads.length} yuk paketlendi: ${bundle.id}`);
      }
    } catch (err) {
      this.logger.error(`Backhaul hatasi: ${err.message}`);
    }
  }

  async generateReloadBundle(payload: {
    shipmentId: string; loadTitle: string; fromCity: string; toCity: string;
    carrierId: string; carrierName: string; deliveryLat: number; deliveryLng: number;
    deliveredAt: Date; vehicleType?: string; tonnageCapacity?: number; volumeCapacity?: number;
  }): Promise<ReloadBundle | null> {
    try {
      this.logger.log(`Araniyor: lat=${payload.deliveryLat} lng=${payload.deliveryLng} r=${RADIUS_KM}km`);

      const result = await this.returnLoadsService.searchReturnLoads({
        deliveryLatitude: payload.deliveryLat,
        deliveryLongitude: payload.deliveryLng,
        radiusKm: RADIUS_KM,
        carrierVehicleType: payload.vehicleType,
        carrierTonnageCapacity: payload.tonnageCapacity,
        carrierVolumeCapacity: payload.volumeCapacity,
        deliveryCompletedAt: payload.deliveredAt,
      });

      this.logger.log(`Sonuc: ${result?.loads?.length || 0} yuk bulundu`);

      if (!result?.loads?.length) return null;

      const topMatches = result.loads
        .filter(l => l.compatibilityScore >= MIN_MATCH_SCORE)
        .slice(0, MAX_BACKHAUL_LOADS);

      if (!topMatches.length) return null;

      const totalEarnings = topMatches.reduce((s, m) => s + (Number(m.load?.totalPrice) || 0), 0);
      const emptyKmSaved = topMatches.reduce((s, m) => s + (m.estimatedRoadKm || 0), 0);

      // Mock bundle oluştur (DB kaydı atlanıyor - test için)
      const bundle = {
        id: 'bundle-' + Date.now(),
        carrierId: payload.carrierId,
        carrierName: payload.carrierName,
        headhaulShipmentId: payload.shipmentId,
        headhaulTitle: payload.loadTitle,
        headhaulFromCity: payload.fromCity,
        headhaulToCity: payload.toCity,
        headhaulDeliveryLat: payload.deliveryLat,
        headhaulDeliveryLng: payload.deliveryLng,
        headhaulDeliveredAt: payload.deliveredAt,
        backhaulLoads: topMatches.map(m => ({
          loadId: m.load.id,
          title: m.load.title || 'Dönüş Yükü',
          fromCity: m.load.fromCity || '?',
          toCity: m.load.toCity || '?',
          price: Number(m.load.totalPrice) || 0,
          distance: m.estimatedRoadKm || 0,
          pickupDate: (m.load as any).pickupDate?.toString() || '',
          vehicleType: (m.load as any).vehicleType || '',
          weight: (m.load as any).totalWeight || 0,
          matchScore: m.compatibilityScore,
          escrowEnabled: !!(m.load as any).escrowEnabled,
        })),
        totalDistance: emptyKmSaved + 200,
        emptyKmSaved,
        totalEarnings,
        emptyKmPercentage: Math.round(emptyKmSaved / 200 * 100),
        optimizedEmptyKmPercentage: 0,
        status: 'suggested',
        expiresAt: new Date(Date.now() + EXPIRE_MINUTES * 60 * 1000),
      } as any;

      return bundle;
    } catch (err) {
      this.logger.error(`generateReloadBundle hata: ${err.message}`, err.stack);
      return null;
    }
  }

  private async notifyCarrier(bundle: ReloadBundle) {
    this.wsGateway.sendToUser(bundle.carrierId, 'AUTOMATED_RELOAD', {
      bundleId: bundle.id,
      backhaulCount: bundle.backhaulLoads.length,
      totalEarnings: bundle.totalEarnings,
      emptyKmSaved: bundle.emptyKmSaved,
      expiresAt: bundle.expiresAt,
      message: `🎯 ${bundle.backhaulLoads.length} dönüş yükü bulundu! ${Number(bundle.totalEarnings).toLocaleString('tr-TR')} ₺ ek kazanç. Boş dönme!`,
    });
  }

  async acceptBundle(bundleId: string, carrierId: string, acceptedLoadIds?: string[]) {
    const bundle = await this.bundleRepo.findOne({ where: { id: bundleId, carrierId } });
    if (!bundle) throw new Error('Paket bulunamadi');
    bundle.status = acceptedLoadIds?.length && acceptedLoadIds.length < bundle.backhaulLoads.length
      ? BundleStatus.PARTIALLY_ACCEPTED : BundleStatus.ACCEPTED;
    bundle.acceptedAt = new Date();
    bundle.acceptedLoadIds = acceptedLoadIds || bundle.backhaulLoads.map(l => l.loadId);
    return this.bundleRepo.save(bundle);
  }

  async declineBundle(bundleId: string, carrierId: string) {
    await this.bundleRepo.update({ id: bundleId, carrierId }, { status: BundleStatus.DECLINED });
    return { success: true };
  }

  async getActiveBundles(carrierId: string) {
    return this.bundleRepo.find({ where: { carrierId, status: BundleStatus.SUGGESTED }, order: { createdAt: 'DESC' }, take: 10 });
  }

  async getBundleHistory(carrierId: string) {
    return this.bundleRepo.find({ where: { carrierId }, order: { createdAt: 'DESC' }, take: 50 });
  }

  @Cron('*/1 * * * *')
  async expireStaleBundles() {
    const expired = await this.bundleRepo
      .createQueryBuilder('b')
      .where('b.status = :status', { status: BundleStatus.SUGGESTED })
      .andWhere('b.expiresAt < :now', { now: new Date() })
      .getMany();
    for (const bundle of expired) {
      await this.bundleRepo.update(bundle.id, { status: BundleStatus.EXPIRED });
    }
    if (expired.length) this.logger.log(`⏰ ${expired.length} paket expire`);
  }
}
