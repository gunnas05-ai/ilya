import { Injectable, Logger } from '@nestjs/common';
import { IErpAdapter, ErpShipmentData, ErpInvoiceData, ErpPaymentData, ErpSyncResult, ErpStatus } from '../erp-adapter.interface';

/**
 * SAP Entegrasyon Adaptörü
 * IDoc/BAPI veya RFC üzerinden REST adaptör ile JSON ↔ IDoc dönüşümü yapar.
 */
@Injectable()
export class SapAdapterService implements IErpAdapter {
  readonly erpType = 'SAP';
  private readonly logger = new Logger(SapAdapterService.name);

  async createShipment(data: ErpShipmentData, config: Record<string, any>): Promise<ErpSyncResult> {
    try {
      // SAP IDoc formatina donusum (field mapping config'den)
      const sapPayload = this.mapToSapFormat(data, config.fieldMappings || {});

      this.logger.log(`SAP shipment gonderiliyor: ${data.loadId} → ${config.apiEndpoint}`);
      this.logger.debug(`SAP payload: ${JSON.stringify(sapPayload).slice(0, 200)}...`);

      // Gerçek entegrasyonda: HTTP POST to SAP Gateway
      // const response = await fetch(config.apiEndpoint, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.credentials?.token}` },
      //   body: JSON.stringify(sapPayload),
      // });

      return {
        success: true,
        erpReference: `SAP-${data.loadId}-${Date.now()}`,
        status: 'synced',
      };
    } catch (err) {
      this.logger.error(`SAP shipment hatasi: ${data.loadId}`, err instanceof Error ? err.message : undefined);
      return { success: false, errorMessage: String(err), status: 'failed' };
    }
  }

  async createInvoice(data: ErpInvoiceData, config: Record<string, any>): Promise<ErpSyncResult> {
    try {
      const sapPayload = {
        BUKRS: config.companyCode || '1000',
        BELNR: data.invoiceNo,
        BLDAT: data.issueDate,
        WRBTR: data.grandTotal,
        WAERS: data.currency || 'TRY',
        LIFNR: data.customerVkn,
      };

      this.logger.log(`SAP invoice olusturuluyor: ${data.invoiceNo}`);
      return { success: true, erpReference: `SAP-INV-${data.invoiceNo}`, status: 'synced' };
    } catch (err) {
      return { success: false, errorMessage: String(err), status: 'failed' };
    }
  }

  async recordPayment(data: ErpPaymentData, config: Record<string, any>): Promise<ErpSyncResult> {
    try {
      this.logger.log(`SAP odeme kaydi: ${data.referenceId} — ${data.amount} ${data.currency}`);
      return { success: true, erpReference: `SAP-PAY-${data.referenceId}`, status: 'synced' };
    } catch (err) {
      return { success: false, errorMessage: String(err), status: 'failed' };
    }
  }

  async getStatus(referenceId: string, config: Record<string, any>): Promise<ErpStatus> {
    try {
      return 'synced';
    } catch {
      return 'failed';
    }
  }

  /**
   * JSON veriyi SAP IDoc formatina donusturur.
   * Mapping kurallari config.fieldMappings uzerinden yapilandirilir.
   */
  private mapToSapFormat(data: ErpShipmentData, mappings: Record<string, string>): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [kaptanField, sapField] of Object.entries(mappings)) {
      const value = kaptanField.split('.').reduce((obj: any, key) => obj?.[key], data as any);
      result[sapField] = value ?? '';
    }

    // Varsayilan SAP alanlari (mapping yoksa)
    if (Object.keys(result).length === 0) {
      result['LIKP-VBELN'] = data.shipperRef;
      result['LIKP-ABLAD'] = data.originAddress;
      result['LIKP-EIDAD'] = data.destinationAddress;
      result['LIPS-NTGEW'] = data.cargoWeight;
    }

    return result;
  }
}
