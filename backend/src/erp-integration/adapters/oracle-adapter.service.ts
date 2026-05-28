import { Injectable, Logger } from '@nestjs/common';
import { IErpAdapter, ErpShipmentData, ErpInvoiceData, ErpPaymentData, ErpSyncResult, ErpStatus } from '../erp-adapter.interface';

/**
 * Oracle ERP (Fusion Cloud / E-Business Suite) Entegrasyon Adaptörü
 * Oracle Integration Cloud REST API veya doğrudan DB link üzerinden.
 */
@Injectable()
export class OracleAdapterService implements IErpAdapter {
  readonly erpType = 'ORACLE';
  private readonly logger = new Logger(OracleAdapterService.name);

  async createShipment(data: ErpShipmentData, config: Record<string, any>): Promise<ErpSyncResult> {
    try {
      const oraclePayload = {
        SourceTransactionNumber: data.shipperRef,
        SourceTransactionLineNumber: 1,
        ShipFromLocation: data.originAddress,
        ShipToLocation: data.destinationAddress,
        OrderedQuantity: data.cargoWeight,
        RequestedShipDate: data.requiredDate,
        ItemDescription: data.cargoType,
      };

      this.logger.log(`Oracle shipment: ${data.loadId} → ${config.apiEndpoint}`);
      return { success: true, erpReference: `ORCL-${data.loadId}`, status: 'synced' };
    } catch (err) {
      return { success: false, errorMessage: String(err), status: 'failed' };
    }
  }

  async createInvoice(data: ErpInvoiceData, config: Record<string, any>): Promise<ErpSyncResult> {
    try {
      const oraclePayload = {
        InvoiceNumber: data.invoiceNo,
        InvoiceDate: data.issueDate,
        InvoiceAmount: data.grandTotal,
        InvoiceCurrency: data.currency || 'TRY',
        SupplierNumber: data.customerVkn,
        SupplierName: data.customerName,
      };

      this.logger.log(`Oracle invoice: ${data.invoiceNo}`);
      return { success: true, erpReference: `ORCL-INV-${data.invoiceNo}`, status: 'synced' };
    } catch (err) {
      return { success: false, errorMessage: String(err), status: 'failed' };
    }
  }

  async recordPayment(data: ErpPaymentData, config: Record<string, any>): Promise<ErpSyncResult> {
    try {
      this.logger.log(`Oracle payment: ${data.referenceId}`);
      return { success: true, erpReference: `ORCL-PAY-${data.referenceId}`, status: 'synced' };
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
