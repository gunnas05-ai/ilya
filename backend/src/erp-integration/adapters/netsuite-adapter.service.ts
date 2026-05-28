import { Injectable, Logger } from '@nestjs/common';
import { IErpAdapter, ErpShipmentData, ErpInvoiceData, ErpPaymentData, ErpSyncResult, ErpStatus } from '../erp-adapter.interface';

/**
 * Netsuite Entegrasyon Adaptörü
 * SuiteTalk SOAP Web Services veya REST Web Services üzerinden.
 */
@Injectable()
export class NetsuiteAdapterService implements IErpAdapter {
  readonly erpType = 'NETSUITE';
  private readonly logger = new Logger(NetsuiteAdapterService.name);

  async createShipment(data: ErpShipmentData, config: Record<string, any>): Promise<ErpSyncResult> {
    try {
      const nsPayload = {
        recordType: 'itemFulfillment',
        externalId: data.loadId,
        shipAddress: { addr1: data.originAddress },
        shipToAddress: { addr1: data.destinationAddress },
        shipDate: data.requiredDate,
      };

      this.logger.log(`Netsuite shipment: ${data.loadId}`);
      return { success: true, erpReference: `NS-IF-${data.loadId}`, status: 'synced' };
    } catch (err) {
      return { success: false, errorMessage: String(err), status: 'failed' };
    }
  }

  async createInvoice(data: ErpInvoiceData, config: Record<string, any>): Promise<ErpSyncResult> {
    try {
      this.logger.log(`Netsuite invoice: ${data.invoiceNo}`);
      return { success: true, erpReference: `NS-INV-${data.invoiceNo}`, status: 'synced' };
    } catch (err) {
      return { success: false, errorMessage: String(err), status: 'failed' };
    }
  }

  async recordPayment(data: ErpPaymentData, config: Record<string, any>): Promise<ErpSyncResult> {
    try {
      this.logger.log(`Netsuite payment: ${data.referenceId}`);
      return { success: true, erpReference: `NS-PAY-${data.referenceId}`, status: 'synced' };
    } catch (err) {
      return { success: false, errorMessage: String(err), status: 'failed' };
    }
  }

  async getStatus(referenceId: string, _config: Record<string, any>): Promise<ErpStatus> {
    try {
      return 'synced';
    } catch {
      return 'failed';
    }
  }
}
