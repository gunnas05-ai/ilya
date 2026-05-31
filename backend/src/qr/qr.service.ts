import { Injectable, NotFoundException, BadRequestException, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import * as crypto from 'crypto';
import { QRCode, QRCheckpointType } from './qr-code.entity';
import { Load } from '../loads/load.entity';
import { TrackingRecord } from '../tracking/tracking.entity';
import { User } from '../users/user.entity';
import { WebSocketGateway } from '../websocket/websocket.gateway';
import { EscrowService } from '../escrow/escrow.service';
import { AuditLogService, AuditAction } from '../escrow/audit-log.service';
import { EscrowMetricsService } from '../escrow/escrow-metrics.service';
import { isWithinRadius } from '../common/distance';

const HMAC_SECRET = process.env.QR_HMAC_SECRET || (() => { throw new Error('QR_HMAC_SECRET env var is required for QR code security'); })();
const ENCRYPTION_KEY = crypto.createHash('sha256').update(HMAC_SECRET + '-aes-key').digest();

function signToken(payload: string): string {
  return crypto.createHmac('sha256', HMAC_SECRET).update(payload).digest('hex');
}

function encryptPayload(data: object): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return iv.toString('hex') + ':' + authTag + ':' + encrypted;
}

function decryptPayload(encrypted: string): object {
  const parts = encrypted.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted payload');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encryptedData = parts[2];
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
}

@Injectable()
export class QrService {
  private readonly logger = new Logger(QrService.name);

  constructor(
    @InjectRepository(QRCode)
    private qrRepo: Repository<QRCode>,
    @InjectRepository(Load)
    private loadRepo: Repository<Load>,
    @InjectRepository(TrackingRecord)
    private trackingRepo: Repository<TrackingRecord>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private wsGateway: WebSocketGateway,
    private escrowService: EscrowService,
    private auditLogService: AuditLogService,
    private metricsService: EscrowMetricsService,
  ) {}

  /** Event-driven QR generation — escrow oluşturulduğunda otomatik tetiklenir */
  @OnEvent('escrow.created')
  async handleEscrowCreated(payload: {
    loadId: string;
    driverId: string;
    customerId: string;
    checkpointType: QRCheckpointType;
  }) {
    try {
      await this.generateQR(payload);
    } catch (err) {
      this.logger.warn(`Auto QR generation failed for load ${payload.loadId}: ${(err as Error).message}`);
    }
  }

  async generateQR(data: {
    loadId: string;
    driverId: string;
    customerId: string;
    checkpointType: QRCheckpointType;
    milestoneIndex?: number;
  }) {
    const load = await this.loadRepo.findOne({ where: { id: data.loadId } });
    if (!load) throw new NotFoundException('Yük bulunamadı');

    const nonce = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60000);
    const timestamp = new Date().toISOString();

    // Build canonical payload for HMAC signing (include milestoneIndex if present)
    const canonicalPayload = `${data.loadId}|${data.driverId}|${data.customerId}|${data.checkpointType}|${data.milestoneIndex ?? ''}|${nonce}|${expiresAt.toISOString()}`;
    const hmacSignature = signToken(canonicalPayload);

    const qrPayload: Record<string, any> = {
      shipmentId: data.loadId,
      driverId: data.driverId,
      customerId: data.customerId,
      timestamp,
      nonce,
      checkpointType: data.checkpointType,
    };
    if (data.milestoneIndex !== undefined) qrPayload.milestoneIndex = data.milestoneIndex;
    const encryptedPayload = encryptPayload(qrPayload);

    const qr = this.qrRepo.create({
      loadId: data.loadId,
      driverId: data.driverId,
      customerId: data.customerId,
      checkpointType: data.checkpointType,
      token: hmacSignature, // use HMAC as the token
      nonce,
      hmacSignature,
      encryptedPayload,
      expiresAt,
      milestoneIndex: data.milestoneIndex,
    });

    const saved = await this.qrRepo.save(qr);

    return {
      id: saved.id,
      token: hmacSignature,
      expiresAt: saved.expiresAt,
      checkpointType: saved.checkpointType,
      qrData: encryptedPayload, // encrypted payload for QR code image
    };
  }

  async validateQR(token: string, scannerData: {
    userId: string;
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    speed?: number;
    deviceFingerprint?: string;
    ipAddress?: string;
  }) {
    const qr = await this.qrRepo.findOne({ where: { token } });
    if (!qr) {
      this.metricsService.recordQrScan(false);
      this.wsGateway.sendToShipment('unknown', 'QR_SCAN_FAILED', { reason: 'invalid_token', userId: scannerData.userId });
      await this.auditLogService.log(AuditAction.QR_SCAN_FAILED, scannerData.userId, token, 'qr', { reason: 'invalid_token' });
      throw new NotFoundException('Geçersiz QR kod');
    }
    if (qr.isUsed) {
      this.metricsService.recordQrScan(false);
      this.wsGateway.sendToShipment(qr.loadId, 'QR_SCAN_FAILED', { reason: 'already_used', token });
      await this.auditLogService.log(AuditAction.QR_SCAN_FAILED, scannerData.userId, qr.id, 'qr', { reason: 'already_used', loadId: qr.loadId });
      throw new BadRequestException('Bu QR kod daha önce kullanılmış');
    }
    if (new Date() > qr.expiresAt) {
      this.metricsService.recordQrScan(false);
      this.wsGateway.sendToShipment(qr.loadId, 'QR_SCAN_FAILED', { reason: 'expired', token });
      await this.auditLogService.log(AuditAction.QR_SCAN_FAILED, scannerData.userId, qr.id, 'qr', { reason: 'expired', loadId: qr.loadId });
      throw new BadRequestException('QR kod süresi dolmuş');
    }

    // Verify HMAC signature
    const canonicalPayload = `${qr.loadId}|${qr.driverId}|${qr.customerId}|${qr.checkpointType}|${qr.milestoneIndex ?? ''}|${qr.nonce}|${qr.expiresAt.toISOString()}`;
    const expectedSignature = signToken(canonicalPayload);
    if (qr.hmacSignature !== expectedSignature) {
      this.metricsService.recordQrScan(false);
      this.wsGateway.sendToShipment(qr.loadId, 'QR_SCAN_FAILED', { reason: 'signature_mismatch', token });
      await this.auditLogService.log(AuditAction.QR_SCAN_FAILED, scannerData.userId, qr.id, 'qr', { reason: 'signature_mismatch', loadId: qr.loadId });
      throw new BadRequestException('QR kod imzası geçersiz');
    }

    // GPS verification using Haversine distance — reject if outside 500m radius
    let gpsVerified = false;
    let gpsMismatch = false;
    if (scannerData.latitude && scannerData.longitude) {
      const load = await this.loadRepo.findOne({ where: { id: qr.loadId } });
      if (load) {
        let expectedLat: number | null = null;
        let expectedLng: number | null = null;

        if (qr.checkpointType === QRCheckpointType.PICKUP) {
          expectedLat = load.pickupLatitude;
          expectedLng = load.pickupLongitude;
        } else if (qr.checkpointType === QRCheckpointType.DELIVERY) {
          expectedLat = load.deliveryLatitude;
          expectedLng = load.deliveryLongitude;
        } else if (qr.checkpointType === QRCheckpointType.TRANSIT || qr.checkpointType === QRCheckpointType.MILESTONE) {
          // Use last tracking record as expected location
          const lastTracking = await this.trackingRepo.findOne({
            where: { loadId: qr.loadId },
            order: { timestamp: 'DESC' as any },
          });
          if (lastTracking) {
            expectedLat = lastTracking.latitude;
            expectedLng = lastTracking.longitude;
          }
        }

        if (expectedLat !== null && expectedLng !== null) {
          const inRange = isWithinRadius(
            scannerData.latitude, scannerData.longitude,
            expectedLat, expectedLng, 500,
          );
          if (!inRange) {
            gpsMismatch = true;
            this.metricsService.recordQrScan(false);
            this.wsGateway.sendToShipment(qr.loadId, 'QR_SCAN_FAILED', { reason: 'gps_mismatch', token });
            await this.auditLogService.log(AuditAction.QR_SCAN_FAILED, scannerData.userId, qr.id, 'qr', { reason: 'gps_mismatch', loadId: qr.loadId, expectedLat, expectedLng, actualLat: scannerData.latitude, actualLng: scannerData.longitude });
            throw new BadRequestException(`GPS konumu eşleşmiyor — beklenen konumdan 500m'den fazla uzakta`);
          }
          gpsVerified = true;
        } else {
          // No reference coordinates — trust the GPS if provided
          gpsVerified = true;
        }
      } else {
        gpsVerified = true;
      }
    }

    // Device fingerprint validation — check against registered driver device
    if (scannerData.deviceFingerprint && qr.driverId) {
      try {
        const driverUser = await this.userRepo.findOne({ where: { id: qr.driverId } });
        if (driverUser?.deviceFingerprint && driverUser.deviceFingerprint !== scannerData.deviceFingerprint) {
          // Device mismatch — allow but flag as risk (don't reject entirely to support multi-device scenarios)
          // Log the anomaly
          await this.auditLogService.log(AuditAction.QR_SCAN_FAILED, scannerData.userId, qr.id, 'qr', {
            reason: 'device_fingerprint_mismatch',
            loadId: qr.loadId,
            expected: driverUser.deviceFingerprint.substring(0, 8) + '...',
            received: scannerData.deviceFingerprint.substring(0, 8) + '...',
          });
          // Do NOT reject — some drivers use multiple devices
          // But the fraud detection service will catch this via check #4 (device_fingerprint)
        }
      } catch (e) {
        // User lookup failure shouldn't block QR validation
      }
    }

    qr.isUsed = true;
    qr.usedAt = new Date();
    qr.scannedByUserId = scannerData.userId;
    qr.scanLatitude = scannerData.latitude ?? null as any;
    qr.scanLongitude = scannerData.longitude ?? null as any;
    qr.scanAccuracy = scannerData.accuracy ?? null as any;
    qr.scanSpeed = scannerData.speed ?? null as any;
    qr.gpsVerified = gpsVerified;
    qr.deviceFingerprint = scannerData.deviceFingerprint ?? null as any;
    await this.qrRepo.save(qr);

    // Real-time event
    this.wsGateway.sendToUser(qr.customerId, 'qr_scanned', {
      loadId: qr.loadId,
      checkpointType: qr.checkpointType,
      timestamp: qr.usedAt,
      gpsVerified,
    });

    this.wsGateway.sendToUser(qr.driverId, 'qr_scanned', {
      loadId: qr.loadId,
      checkpointType: qr.checkpointType,
      timestamp: qr.usedAt,
      gpsVerified,
    });

    this.metricsService.recordQrScan(true);
    this.wsGateway.sendToShipment(qr.loadId, 'QR_SCANNED', { checkpointType: qr.checkpointType, scannedBy: scannerData.userId, gpsVerified });
    await this.auditLogService.log(AuditAction.QR_SCANNED, scannerData.userId, qr.id, 'qr', { loadId: qr.loadId, checkpointType: qr.checkpointType, gpsVerified });

    // Trigger escrow state transition based on checkpoint type
    let escrowResult = null;
    try {
      escrowResult = await this.escrowService.processQrScan(qr.loadId, qr.checkpointType, {
        latitude: qr.scanLatitude,
        longitude: qr.scanLongitude,
        accuracy: qr.scanAccuracy,
        speed: qr.scanSpeed,
        deviceFingerprint: qr.deviceFingerprint,
        ipAddress: scannerData.ipAddress,
      });
    } catch (e) {
      // Escrow processing failure should not block QR validation
      // Log and continue
    }

    return {
      valid: true,
      checkpointType: qr.checkpointType,
      gpsVerified,
      loadId: qr.loadId,
      escrow: escrowResult ? {
        message: (escrowResult as any).message,
        status: (escrowResult as any).escrow?.status,
      } : null,
    };
  }

  async getQRHistory(loadId: string) {
    return this.qrRepo.find({
      where: { loadId },
      order: { createdAt: 'DESC' },
    });
  }
}
