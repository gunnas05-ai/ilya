import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { CustomsDeclaration, CustomsDocument } from './entities/customs-declaration.entity';
import { MessageBusService } from '../common/message-bus.service';

let _encryptionKey: Buffer | null = null;

function getEncryptionKey(): Buffer {
  if (!_encryptionKey) {
    _encryptionKey = scryptSync(
      process.env.CUSTOMS_ENCRYPTION_KEY || 'kaptan-customs-key-change-in-production',
      'salt',
      32,
    );
  }
  return _encryptionKey;
}

@Injectable()
export class CustomsService {
  private readonly logger = new Logger(CustomsService.name);

  constructor(
    @InjectRepository(CustomsDeclaration) private declarationRepo: Repository<CustomsDeclaration>,
    @InjectRepository(CustomsDocument) private documentRepo: Repository<CustomsDocument>,
    private messageBus: MessageBusService,
  ) {}

  async createDeclaration(data: {
    loadId: string;
    customsOffice: string;
    regime: string;
    brokerId?: string;
    brokerName?: string;
    sensitiveData?: Record<string, any>;
  }): Promise<CustomsDeclaration> {
    const existing = await this.declarationRepo.findOne({ where: { loadId: data.loadId } });
    if (existing) throw new BadRequestException('Bu yuk icin zaten beyanname mevcut');

    const declaration = this.declarationRepo.create({
      loadId: data.loadId,
      customsOffice: data.customsOffice,
      regime: data.regime,
      brokerId: data.brokerId,
      brokerName: data.brokerName,
      status: 'SUBMITTED',
    });

    // Hassas verileri AES-256 ile sifrele
    if (data.sensitiveData) {
      const iv = randomBytes(16);
      const cipher = createCipheriv('aes-256-cbc', getEncryptionKey(), iv);
      const encrypted = Buffer.concat([
        iv,
        cipher.update(JSON.stringify(data.sensitiveData), 'utf-8'),
        cipher.final(),
      ]);
      declaration.encryptedData = encrypted.toString('base64');
    }

    const saved = await this.declarationRepo.save(declaration);
    this.logger.log(`Gumruk beyannamesi: ${saved.id} — ${data.customsOffice}`);

    return saved;
  }

  async updateStatus(id: string, status: string, reason?: string): Promise<CustomsDeclaration> {
    const declaration = await this.declarationRepo.findOne({ where: { id } });
    if (!declaration) throw new NotFoundException('Beyanname bulunamadi');

    declaration.status = status;
    if (status === 'CLEARED') declaration.clearedAt = new Date();
    if (status === 'REJECTED') declaration.rejectionReason = reason || '';
    const saved = await this.declarationRepo.save(declaration);

    // Event'ler
    const eventType = status === 'CLEARED' ? 'customs.cleared' : 'customs.rejected';
    await this.messageBus.emit(eventType, {
      declarationId: saved.id,
      loadId: saved.loadId,
      status,
      reason,
    });

    this.logger.log(`Gumruk durumu: ${saved.id} → ${status}`);
    return saved;
  }

  async addDocument(declarationId: string, file: {
    originalName: string; mimeType: string; fileUrl: string; type: string;
  }): Promise<CustomsDocument> {
    const doc = this.documentRepo.create({
      declarationId,
      ...file,
    });
    return this.documentRepo.save(doc);
  }

  async getDeclaration(loadId: string): Promise<CustomsDeclaration | null> {
    return this.declarationRepo.findOne({ where: { loadId } });
  }

  async getDocuments(declarationId: string): Promise<CustomsDocument[]> {
    return this.documentRepo.find({ where: { declarationId } });
  }

  /**
   * Sifreli veriyi cozer (sadece yetkili kullanicilar)
   */
  decryptData(encryptedBase64: string): Record<string, any> | null {
    try {
      const buffer = Buffer.from(encryptedBase64, 'base64');
      const iv = buffer.subarray(0, 16);
      const encrypted = buffer.subarray(16);
      const decipher = createDecipheriv('aes-256-cbc', getEncryptionKey(), iv);
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      return JSON.parse(decrypted.toString('utf-8'));
    } catch {
      return null;
    }
  }
}
