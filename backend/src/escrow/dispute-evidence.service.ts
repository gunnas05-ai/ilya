import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { v4 as uuid } from 'uuid';
import { DisputeEvidence, EvidenceType } from './dispute-evidence.entity';
import { Dispute, DisputeStatus } from './dispute.entity';

@Injectable()
export class DisputeEvidenceService {
  private readonly uploadDir = join(process.cwd(), 'uploads', 'dispute-evidence');

  constructor(
    @InjectRepository(DisputeEvidence)
    private evidenceRepo: Repository<DisputeEvidence>,
    @InjectRepository(Dispute)
    private disputeRepo: Repository<Dispute>,
  ) {
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadEvidence(disputeId: string, userId: string, file: Express.Multer.File) {
    const dispute = await this.disputeRepo.findOne({ where: { id: disputeId } });
    if (!dispute) throw new NotFoundException('İhtilaf bulunamadı');

    // Check 72-hour window
    if (dispute.evidenceDeadline && new Date() > new Date(dispute.evidenceDeadline)) {
      throw new BadRequestException('Kanıt yükleme süresi doldu (72 saat)');
    }

    // Only parties involved can upload
    const escrow = await this.disputeRepo.manager
      .createQueryBuilder()
      .select('escrow')
      .from('escrow_transactions', 'escrow')
      .where('escrow.id = :id', { id: dispute.escrowTransactionId })
      .getRawOne();

    if (!file) throw new BadRequestException('Dosya gerekli');

    // Determine type from mimetype
    const type = this.determineType(file.mimetype);

    // Save file to disk
    const ext = file.originalname.split('.').pop() || 'bin';
    const fileName = `${uuid()}.${ext}`;
    const filePath = join(this.uploadDir, fileName);
    writeFileSync(filePath, file.buffer);

    const evidence = this.evidenceRepo.create({
      disputeId,
      type,
      fileUrl: `/uploads/dispute-evidence/${fileName}`,
      originalName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      uploadedByUserId: userId,
      metadata: { originalPath: filePath },
    });

    const saved = await this.evidenceRepo.save(evidence);

    // Update count on dispute
    dispute.totalEvidenceCount += 1;
    await this.disputeRepo.save(dispute);

    return saved;
  }

  async getEvidenceForDispute(disputeId: string) {
    return this.evidenceRepo.find({
      where: { disputeId },
      order: { createdAt: 'DESC' },
    });
  }

  async deleteEvidence(evidenceId: string, userId: string) {
    const evidence = await this.evidenceRepo.findOne({ where: { id: evidenceId } });
    if (!evidence) throw new NotFoundException('Kanıt bulunamadı');

    if (evidence.uploadedByUserId !== userId) {
      throw new ForbiddenException('Yalnızca yükleyen silebilir');
    }

    const dispute = await this.disputeRepo.findOne({ where: { id: evidence.disputeId } });
    if (dispute && dispute.evidenceDeadline && new Date() > new Date(dispute.evidenceDeadline)) {
      throw new BadRequestException('Kanıt silme süresi doldu');
    }

    await this.evidenceRepo.remove(evidence);

    if (dispute) {
      dispute.totalEvidenceCount = Math.max(0, dispute.totalEvidenceCount - 1);
      await this.disputeRepo.save(dispute);
    }

    return { message: 'Kanıt silindi' };
  }

  private determineType(mimeType: string): EvidenceType {
    if (mimeType.startsWith('image/')) return EvidenceType.PHOTO;
    if (mimeType.startsWith('video/')) return EvidenceType.VIDEO;
    if (mimeType === 'application/pdf') return EvidenceType.PDF;
    if (mimeType.startsWith('audio/')) return EvidenceType.AUDIO;
    return EvidenceType.PHOTO;
  }
}
