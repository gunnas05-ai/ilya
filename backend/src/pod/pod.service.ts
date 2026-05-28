import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DeliverySignature } from './delivery-signature.entity';
import { DeliveryPhoto } from './delivery-photo.entity';
import { calculateDistance } from '../common/distance';
import { Load, LoadStatus } from '../loads/load.entity';
import { Dispute, DisputeReason, DisputeStatus } from '../escrow/dispute.entity';
import { DisputeEvidence } from '../escrow/dispute-evidence.entity';
import { EscrowTransaction } from '../escrow/escrow-transaction.entity';

export interface DamageReportData {
  loadId: string;
  driverId: string;
  damageTypes: string[];
  driverNote: string;
  photoUrls: string[];
  latitude?: number;
  longitude?: number;
}

@Injectable()
export class PodService {
  private readonly logger = new Logger(PodService.name);

  constructor(
    @InjectRepository(DeliverySignature)
    private signatureRepo: Repository<DeliverySignature>,
    @InjectRepository(DeliveryPhoto)
    private photoRepo: Repository<DeliveryPhoto>,
    @InjectRepository(Load)
    private loadRepo: Repository<Load>,
    @InjectRepository(Dispute)
    private disputeRepo: Repository<Dispute>,
    @InjectRepository(DisputeEvidence)
    private evidenceRepo: Repository<DisputeEvidence>,
    @InjectRepository(EscrowTransaction)
    private escrowRepo: Repository<EscrowTransaction>,
    private eventEmitter: EventEmitter2,
  ) {}

  async saveSignature(data: {
    loadId: string;
    driverId: string;
    signatureImageBase64: string;
    vectorPath?: any;
    signerName: string;
    signerRole?: string;
    ipAddress?: string;
    deviceId?: string;
    latitude?: number;
    longitude?: number;
  }) {
    const load = await this.loadRepo.findOne({ where: { id: data.loadId } });
    if (!load) throw new NotFoundException('Yük bulunamadı');

    // Geo-verification: Check if driver is actually near the delivery point
    if (data.latitude && data.longitude && load.deliveryLatitude && load.deliveryLongitude) {
      const distance = calculateDistance(data.latitude, data.longitude, load.deliveryLatitude, load.deliveryLongitude);
      // Let's assume delivery must be within 5km radius to be signed
      if (distance > 5) {
        this.logger.warn(`Signature geo-verification failed for Load ${data.loadId}. Distance: ${distance}km`);
        // We might choose to flag it as suspicious instead of blocking completely due to GPS inaccuracies
      }
    }

    const signature = this.signatureRepo.create(data);
    await this.signatureRepo.save(signature);

    await this.checkDeliveryCompletion(data.loadId);
    return signature;
  }

  async savePhoto(data: {
    loadId: string;
    driverId: string;
    photoUrl: string;
    latitude?: number;
    longitude?: number;
  }) {
    const photo = this.photoRepo.create(data);
    await this.photoRepo.save(photo);
    return photo;
  }

  async generatePdf(loadId: string) {
    // In a real application, this would use PDFMake or Puppeteer to combine
    // Load details, Photo, and Signature into a formal A4 document.
    this.logger.log(`Generating ePOD PDF for Load ${loadId}`);
    return `https://kaptan-storage.s3.amazonaws.com/epod/POD_${loadId}.pdf`;
  }

  private async checkDeliveryCompletion(loadId: string) {
    const load = await this.loadRepo.findOne({ where: { id: loadId } });
    if (!load || load.status === LoadStatus.TESLIM_EDILDI) return;

    // Check if signature exists
    const signature = await this.signatureRepo.findOne({ where: { loadId } });
    if (signature) {
      // Mark load as delivered
      load.status = LoadStatus.TESLIM_EDILDI;
      await this.loadRepo.save(load);

      // Generate PDF (mock)
      const pdfUrl = await this.generatePdf(loadId);

      // Emit event for Escrow Service to release funds
      this.logger.log(`ePOD requirements met for Load ${loadId}. Emitting DELIVERY_COMPLETED_VERIFIED event.`);
      this.eventEmitter.emit('delivery.completed.verified', {
        loadId,
        driverId: load.receiverId,
        shipperId: load.creatorId,
        pdfUrl,
      });
    }
  }

  async saveDamageReport(data: DamageReportData) {
    const load = await this.loadRepo.findOne({ where: { id: data.loadId } });
    if (!load) throw new NotFoundException('Yük bulunamadı');

    if (!data.damageTypes || data.damageTypes.length === 0) {
      throw new BadRequestException('En az bir hasar/eksiklik türü seçilmelidir.');
    }

    let escrowTx = await this.escrowRepo.findOne({ where: { loadId: data.loadId } });
    const escrowTxId = escrowTx?.id || data.loadId;

    const reasonMap: Record<string, DisputeReason> = {
      hasarli: DisputeReason.HASAR,
      eksik: DisputeReason.EKSIK_TESLIM,
      yanlis_urun: DisputeReason.YANLIS_TESLIM,
      gecikme: DisputeReason.GECIKME,
      evrak_eksik: DisputeReason.EVRAK_EKSIKLIGI,
      diger: DisputeReason.DIGER,
    };

    const primaryReason = reasonMap[data.damageTypes[0]] || DisputeReason.DIGER;

    const evidencePayload = {
      damageTypes: data.damageTypes,
      driverNote: data.driverNote,
      photoCount: data.photoUrls.length,
      gpsLocation: data.latitude && data.longitude
        ? { lat: data.latitude, lng: data.longitude }
        : null,
      reportedAt: new Date().toISOString(),
    };

    const dispute = this.disputeRepo.create({
      escrowTransactionId: escrowTxId,
      openedByUserId: data.driverId,
      reason: primaryReason,
      description: data.driverNote || 'Sürücü tarafından hasarlı/eksik teslimat bildirimi yapıldı.',
      evidence: evidencePayload,
      status: DisputeStatus.OPEN,
      evidenceDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      totalEvidenceCount: data.photoUrls.length,
    });
    const savedDispute = await this.disputeRepo.save(dispute);

    for (const url of data.photoUrls) {
      await this.evidenceRepo.save(
        this.evidenceRepo.create({
          disputeId: savedDispute.id,
          fileUrl: url,
          originalName: `damage-photo-${Date.now()}.jpg`,
          mimeType: 'image/jpeg',
          fileSize: 0,
          uploadedByUserId: data.driverId,
          type: 'photo' as any,
        }),
      );
      await this.photoRepo.save(
        this.photoRepo.create({
          loadId: data.loadId,
          driverId: data.driverId,
          photoUrl: url,
          latitude: data.latitude,
          longitude: data.longitude,
        }),
      );
    }

    this.eventEmitter.emit('dispute.opened', {
      disputeId: savedDispute.id,
      loadId: data.loadId,
      escrowTransactionId: escrowTxId,
      openedBy: data.driverId,
    });

    this.logger.log(`Damage dispute created for Load ${data.loadId}, Dispute ${savedDispute.id}`);

    return {
      disputeId: savedDispute.id,
      status: savedDispute.status,
      reason: savedDispute.reason,
      totalEvidenceCount: savedDispute.totalEvidenceCount,
      createdAt: savedDispute.createdAt,
    };
  }
}
