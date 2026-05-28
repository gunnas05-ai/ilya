import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShipmentDocument, DocumentType, DocumentStatus } from './shipment-document.entity';

const REQUIRED_DOCS: DocumentType[] = [DocumentType.CMR, DocumentType.INVOICE, DocumentType.DELIVERY_NOTE];

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);

  constructor(
    @InjectRepository(ShipmentDocument) private repo: Repository<ShipmentDocument>,
  ) {}

  /** Evrak yükle */
  async upload(data: { shipmentId: string; carrierId?: string; type: DocumentType; name: string; fileUrl?: string; ocrData?: any }) {
    return this.repo.save(this.repo.create({ ...data, status: DocumentStatus.UPLOADED }));
  }

  /** Evrak doğrula */
  async verify(id: string, userId: string) {
    await this.repo.update(id, { status: DocumentStatus.VERIFIED, verifiedBy: userId, verifiedAt: new Date() });
    return { success: true };
  }

  /** Evrak reddet */
  async reject(id: string, notes: string) {
    await this.repo.update(id, { status: DocumentStatus.REJECTED, notes });
    return { success: true };
  }

  /** Sevkiyata ait tüm evraklar */
  async getShipmentDocs(shipmentId: string) {
    return this.repo.find({ where: { shipmentId }, order: { createdAt: 'DESC' } });
  }

  /** Eksik zorunlu evrakları kontrol et */
  async getMissingDocs(shipmentId: string): Promise<DocumentType[]> {
    const existing = await this.repo.find({ where: { shipmentId } });
    const existingTypes = existing.filter(d => d.status !== DocumentStatus.REJECTED).map(d => d.type);
    return REQUIRED_DOCS.filter(t => !existingTypes.includes(t));
  }

  /** Eksik evrağı olan tüm sevkiyatlar */
  async getShipmentsWithMissingDocs(): Promise<Array<{ shipmentId: string; missing: string[]; uploaded: number }>> {
    const allDocs = await this.repo.find({ order: { createdAt: 'DESC' } });
    const grouped: Record<string, ShipmentDocument[]> = {};
    for (const d of allDocs) {
      if (!grouped[d.shipmentId]) grouped[d.shipmentId] = [];
      grouped[d.shipmentId].push(d);
    }

    const result: any[] = [];
    for (const [shipmentId, docs] of Object.entries(grouped)) {
      const types = docs.filter(d => d.status !== DocumentStatus.REJECTED).map(d => d.type);
      const missing = REQUIRED_DOCS.filter(t => !types.includes(t));
      result.push({ shipmentId, missing, uploaded: docs.length });
    }

    return result.filter(r => r.missing.length > 0).slice(0, 50);
  }

  /** Dashboard özeti */
  async getDashboardSummary() {
    const all = await this.repo.find();
    const total = all.length;
    const verified = all.filter(d => d.status === DocumentStatus.VERIFIED).length;
    const missingCount = all.filter(d => d.status === DocumentStatus.MISSING).length;
    const typeBreakdown: any = {};
    for (const d of all) {
      typeBreakdown[d.type] = (typeBreakdown[d.type] || 0) + 1;
    }
    return { total, verified, missingCount, typeBreakdown };
  }

  /** Toplu evrak durumu — tüm sevkiyatlar için eksik kontrolü */
  async getAllShipmentsStatus() {
    const all = await this.repo.find({ order: { createdAt: 'DESC' } });
    const grouped: Record<string, any> = {};
    for (const d of all) {
      if (!grouped[d.shipmentId]) grouped[d.shipmentId] = { shipmentId: d.shipmentId, docs: [], missing: [] };
      grouped[d.shipmentId].docs.push(d);
    }
    for (const [id, data] of Object.entries(grouped)) {
      const types = data.docs.filter((d: any) => d.status !== DocumentStatus.REJECTED).map((d: any) => d.type);
      data.missing = REQUIRED_DOCS.filter(t => !types.includes(t));
      data.status = data.missing.length === 0 ? 'complete' : 'incomplete';
      data.docCount = data.docs.length;
    }
    return Object.values(grouped).slice(0, 50);
  }
}
