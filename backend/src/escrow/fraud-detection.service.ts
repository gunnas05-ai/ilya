import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrackingRecord } from '../tracking/tracking.entity';
import { Load } from '../loads/load.entity';
import { QRCode } from '../qr/qr-code.entity';
import { Dispute } from './dispute.entity';
import { isWithinRadius, calculateDistance } from '../common/distance';

export enum RiskTier {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export interface FraudCheckResult {
  name: string;
  passed: boolean;
  score: number;
  details: string;
}

export interface FraudAssessment {
  score: number;
  tier: RiskTier;
  checks: FraudCheckResult[];
}

@Injectable()
export class FraudDetectionService {
  constructor(
    @InjectRepository(TrackingRecord)
    private trackingRepo: Repository<TrackingRecord>,
    @InjectRepository(QRCode)
    private qrRepo: Repository<QRCode>,
    @InjectRepository(Dispute)
    private disputeRepo: Repository<Dispute>,
  ) {}

  async assess(load: Load, scanData: {
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    speed?: number;
    deviceFingerprint?: string;
    ipAddress?: string;
  }, carrierId?: string): Promise<FraudAssessment> {
    const checks: FraudCheckResult[] = [];
    let totalScore = 0;

    // 1. GPS radius check — is the scan within 500m of expected location?
    if (scanData.latitude && scanData.longitude) {
      const expectedLat = load.pickupLatitude;
      const expectedLng = load.pickupLongitude;
      if (expectedLat && expectedLng) {
        const inRange = isWithinRadius(scanData.latitude, scanData.longitude, expectedLat, expectedLng, 500);
        const gpsScore = inRange ? 0 : 30;
        checks.push({
          name: 'gps_radius',
          passed: inRange,
          score: gpsScore,
          details: inRange
            ? 'Konum 500m menzil içinde'
            : `Beklenen konumdan uzak (${expectedLat},${expectedLng})`,
        });
        totalScore += gpsScore;
      } else {
        checks.push({ name: 'gps_radius', passed: true, score: 0, details: 'Referans konum yok, atlanıyor' });
      }
    }

    // 2. Speed anomaly — if speed > 10 km/h at scan, suspicious
    if (scanData.speed !== undefined && scanData.speed !== null) {
      const speedAbnormal = scanData.speed > 10;
      const speedScore = speedAbnormal ? 20 : 0;
      checks.push({
        name: 'speed_anomaly',
        passed: !speedAbnormal,
        score: speedScore,
        details: speedAbnormal
          ? `Anormal hız: ${scanData.speed} km/h (kontrol noktasında >10 beklenmez)`
          : `Hız normal: ${scanData.speed} km/h`,
      });
      totalScore += speedScore;
    }

    // 3. Location jump — compare with previous QR scan for this load
    try {
      const previousScans = await this.qrRepo.find({
        where: { loadId: load.id, isUsed: true },
        order: { usedAt: 'DESC' },
        take: 1,
      });
      if (previousScans.length > 0 && scanData.latitude && scanData.longitude) {
        const prev = previousScans[0];
        if (prev.scanLatitude && prev.scanLongitude) {
          const distance = isWithinRadius(
            scanData.latitude, scanData.longitude,
            prev.scanLatitude, prev.scanLongitude,
            50000, // 50km — if jump > 50km between scans, flag
          );
          const jumpScore = distance ? 0 : 25;
          checks.push({
            name: 'location_jump',
            passed: distance,
            score: jumpScore,
            details: distance
              ? 'Konum tutarlı'
              : 'Önceki taramadan >50km sıçrama tespit edildi',
          });
          totalScore += jumpScore;
        }
      }
    } catch (e) {
      checks.push({ name: 'location_jump', passed: true, score: 0, details: 'Kontrol edilemedi' });
    }

    // 4. Device fingerprint consistency
    if (scanData.deviceFingerprint) {
      const previousScansForDevice = await this.qrRepo.count({
        where: {
          loadId: load.id,
          isUsed: true,
          deviceFingerprint: scanData.deviceFingerprint,
        },
      });
      const deviceConsistent = previousScansForDevice > 0;
      const deviceScore = deviceConsistent ? 0 : 15;
      checks.push({
        name: 'device_fingerprint',
        passed: deviceConsistent,
        score: deviceScore,
        details: deviceConsistent
          ? `Aynı cihaz (${scanData.deviceFingerprint.substring(0, 8)}...) kullanıldı`
          : `Yeni cihaz (${scanData.deviceFingerprint.substring(0, 8)}...) — risk arttı`,
      });
      totalScore += deviceScore;
    }

    // 5. Route alignment — check if near tracking history
    try {
      const recentTracking = await this.trackingRepo.findOne({
        where: { loadId: load.id },
        order: { timestamp: 'DESC' },
      });
      if (recentTracking && scanData.latitude && scanData.longitude) {
        const aligned = isWithinRadius(
          scanData.latitude, scanData.longitude,
          recentTracking.latitude, recentTracking.longitude,
          1000, // 1km from last known GPS position
        );
        const routeScore = aligned ? 0 : 10;
        checks.push({
          name: 'route_alignment',
          passed: aligned,
          score: routeScore,
          details: aligned
            ? 'Rota ile uyumlu'
            : 'Son GPS noktasından >1km uzak',
        });
        totalScore += routeScore;
      } else {
        checks.push({ name: 'route_alignment', passed: true, score: 0, details: 'Tracking verisi yok' });
      }
    } catch (e) {
      checks.push({ name: 'route_alignment', passed: true, score: 0, details: 'Kontrol edilemedi' });
    }

    // 6. Fake GPS detection — check accuracy and coordinate validity
    if (scanData.latitude && scanData.longitude) {
      // Check for exact 0,0 coordinates (common in emulators/fake GPS)
      const isZeroCoordinate = scanData.latitude === 0 && scanData.longitude === 0;
      // Check for unnaturally precise coordinates (fake GPS apps often have 6+ decimal places)
      const latStr = scanData.latitude.toString();
      const lngStr = scanData.longitude.toString();
      const excessivePrecision = (latStr.includes('.') && latStr.split('.')[1]?.length > 6) &&
        (lngStr.includes('.') && lngStr.split('.')[1]?.length > 6);
      // Check accuracy (high accuracy = more likely real GPS)
      const poorAccuracy = scanData.accuracy !== undefined && scanData.accuracy > 100;

      const fakeGpsScore = (isZeroCoordinate || excessivePrecision || poorAccuracy) ? 15 : 0;
      checks.push({
        name: 'fake_gps',
        passed: !isZeroCoordinate && !excessivePrecision && !poorAccuracy,
        score: fakeGpsScore,
        details: isZeroCoordinate
          ? '0,0 koordinatı tespit edildi (fake GPS)'
          : excessivePrecision
            ? 'Anormal hassasiyet — sahte GPS olabilir'
            : poorAccuracy
              ? `Düşük GPS doğruluğu: ${scanData.accuracy}m`
              : 'GPS koordinatları geçerli',
      });
      totalScore += fakeGpsScore;
    }

    // 7. Multi-device anomaly — check distinct device fingerprints used
    try {
      const distinctDevices = await this.qrRepo
        .createQueryBuilder('qr')
        .where('qr.loadId = :loadId', { loadId: load.id })
        .andWhere('qr.isUsed = true')
        .andWhere('qr.deviceFingerprint IS NOT NULL')
        .select('COUNT(DISTINCT qr.deviceFingerprint)', 'count')
        .getRawOne();
      const deviceCount = parseInt(distinctDevices?.count || '0');
      if (deviceCount >= 3) {
        const multiDeviceScore = 20;
        checks.push({
          name: 'multi_device',
          passed: false,
          score: multiDeviceScore,
          details: `${deviceCount} farklı cihaz tespit edildi — çoklu cihaz anomalisi`,
        });
        totalScore += multiDeviceScore;
      } else if (deviceCount >= 2) {
        checks.push({
          name: 'multi_device',
          passed: true,
          score: 5,
          details: `${deviceCount} farklı cihaz — düşük risk`,
        });
        totalScore += 5;
      }
    } catch (e) {
      checks.push({ name: 'multi_device', passed: true, score: 0, details: 'Kontrol edilemedi' });
    }

    // 8. Impossible delivery time check
    try {
      if (scanData.latitude && scanData.longitude && load.pickupLatitude && load.pickupLongitude) {
        const firstScan = await this.qrRepo.findOne({
          where: { loadId: load.id, isUsed: true },
          order: { usedAt: 'ASC' },
        });
        if (firstScan?.usedAt) {
          const elapsedHours = (Date.now() - new Date(firstScan.usedAt).getTime()) / 3600000;
          // Calculate straight-line distance between pickup and current scan
          const distKm = calculateDistance(
            load.pickupLatitude, load.pickupLongitude,
            scanData.latitude, scanData.longitude,
          );
          // Even at 80 km/h average, minimum time needed
          const minHoursNeeded = distKm / 80;
          if (elapsedHours > 0 && elapsedHours < minHoursNeeded * 0.5) {
            // Arrived way too fast — suspicious
            const timeScore = 20;
            checks.push({
              name: 'impossible_delivery_time',
              passed: false,
              score: timeScore,
              details: `İmkansız teslimat: ${distKm}km mesafe ${elapsedHours.toFixed(1)} saatte kat edildi (minimum ${minHoursNeeded.toFixed(1)} saat gerekli)`,
            });
            totalScore += timeScore;
          } else {
            checks.push({ name: 'impossible_delivery_time', passed: true, score: 0, details: 'Teslimat süresi makul' });
          }
        } else {
          checks.push({ name: 'impossible_delivery_time', passed: true, score: 0, details: 'İlk tarama yok, atlanıyor' });
        }
      } else {
        checks.push({ name: 'impossible_delivery_time', passed: true, score: 0, details: 'Referans konum yok' });
      }
    } catch (e) {
      checks.push({ name: 'impossible_delivery_time', passed: true, score: 0, details: 'Kontrol edilemedi' });
    }

    // 9. IP address analysis — check for suspicious patterns
    if (scanData.ipAddress) {
      const ip = scanData.ipAddress;
      let ipScore = 0;
      const ipReasons: string[] = [];

      // Check for private/reserved IPs (common in emulators/internal networks)
      const isPrivate = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|0\.|::1$|fe80:)/.test(ip);
      if (isPrivate) {
        ipScore += 10;
        ipReasons.push('Özel/yerel IP aralığı (emülatör/iç ağ)');
      }

      // Check for localhost
      if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
        ipScore += 15;
        ipReasons.push('Localhost IP — doğrudan sunucu bağlantısı');
      }

      // Check for common VPN/datacenter IP ranges (simplified — production should use IP geolocation API)
      if (ip.startsWith('5.') || ip.startsWith('34.') || ip.startsWith('35.') || ip.startsWith('104.') || ip.startsWith('108.')) {
        // Common cloud provider ranges (GCP, AWS, Cloudflare) — flag as medium risk
        ipScore += 5;
        ipReasons.push('Bilinen veri merkezi/cloud IP aralığı');
      }

      // Check distinct IPs used for this load (multi-IP anomaly)
      try {
        const distinctIps = await this.qrRepo
          .createQueryBuilder('qr')
          .where('qr.loadId = :loadId', { loadId: load.id })
          .andWhere('qr.isUsed = true')
          .getCount();

        // Only flag if scan count > 3 AND we can't check IP distinctness without IP column
        // We use device fingerprint as a proxy for distinct sources
        if (distinctIps >= 3) {
          // Multiple scan sources from different IPs is suspicious
          // (approximated by checking if this is a new device for this load)
          const priorScansWithDevice = await this.qrRepo.count({
            where: { loadId: load.id, isUsed: true, deviceFingerprint: scanData.deviceFingerprint },
          });
          if (priorScansWithDevice === 0 && distinctIps >= 3) {
            ipScore += 5;
            ipReasons.push('Bu yük için yeni IP/cihaz — çoklu kaynak anomalisi');
          }
        }
      } catch (e) {
        // Skip if query fails
      }

      if (ipScore > 0) {
        checks.push({
          name: 'ip_analysis',
          passed: false,
          score: Math.min(ipScore, 20),
          details: ipReasons.join('; '),
        });
        totalScore += Math.min(ipScore, 20);
      } else {
        checks.push({ name: 'ip_analysis', passed: true, score: 0, details: `IP adresi normal: ${ip}` });
      }
    } else {
      checks.push({ name: 'ip_analysis', passed: false, score: 5, details: 'IP adresi sağlanmadı — düşük risk' });
    }

    // Dispute history check — prior disputes increase risk
    if (carrierId) {
      try {
        const priorDisputes = await this.disputeRepo.count({
          where: { openedByUserId: carrierId },
        });
        if (priorDisputes > 0) {
          const disputeScore = Math.min(priorDisputes * 5, 20);
          checks.push({
            name: 'dispute_history',
            passed: priorDisputes === 0,
            score: disputeScore,
            details: `${priorDisputes} geçmiş ihtilaf — risk ${priorDisputes >= 3 ? 'yüksek' : 'arttı'}`,
          });
          totalScore += disputeScore;
        } else {
          checks.push({ name: 'dispute_history', passed: true, score: 0, details: 'Geçmiş ihtilaf yok' });
        }
      } catch (e) {
        checks.push({ name: 'dispute_history', passed: true, score: 0, details: 'Kontrol edilemedi' });
      }
    } else {
      checks.push({ name: 'dispute_history', passed: true, score: 0, details: 'Taşıyıcı bilgisi yok' });
    }

    if (scanData.deviceFingerprint) {
      try {
        const recentScansByDevice = await this.qrRepo.count({
          where: { deviceFingerprint: scanData.deviceFingerprint },
        });
        // If this device has already scanned >15 QRs, flag as possible automated abuse
        const abuseScore = recentScansByDevice > 15 ? 10 : 0;
        checks.push({
          name: 'wallet_abuse',
          passed: abuseScore === 0,
          score: abuseScore,
          details: abuseScore > 0
            ? `Aynı cihazdan ${recentScansByDevice} tarama — otomasyon şüphesi`
            : 'Cihaz kullanımı normal',
        });
        totalScore += abuseScore;
      } catch (e) {
        checks.push({ name: 'wallet_abuse', passed: true, score: 0, details: 'Kontrol edilemedi' });
      }
    } else {
      checks.push({ name: 'wallet_abuse', passed: true, score: 0, details: 'Cihaz parmakizi yok' });
    }

    // 11. Device root/emulator detection from fingerprint patterns
    if (scanData.deviceFingerprint) {
      const fp = scanData.deviceFingerprint.toLowerCase();
      const rootIndicators = ['root', 'jailbreak', 'emulator', 'genymotion', 'nox', 'blueStacks', 'android_studio', 'xposed', 'magisk'];
      const isRooted = rootIndicators.some(indicator => fp.includes(indicator));
      if (isRooted) {
        checks.push({
          name: 'root_detection',
          passed: false,
          score: 15,
          details: 'Rootlu/jailbreakli cihaz veya emulator tespit edildi',
        });
        totalScore += 15;
      } else {
        checks.push({ name: 'root_detection', passed: true, score: 0, details: 'Cihaz güvenli' });
      }
    }

    totalScore = Math.min(totalScore, 99);
    const tier = this.determineTier(totalScore);

    return { score: totalScore, tier, checks };
  }

  private determineTier(score: number): RiskTier {
    if (score <= 29) return RiskTier.LOW;
    if (score <= 69) return RiskTier.MEDIUM;
    return RiskTier.HIGH;
  }
}
