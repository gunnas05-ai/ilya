/**
 * ERP Adaptör Arayüzü — Plugin mimari
 * Her ERP sistemi (SAP, Oracle, Netsuite vb.) bu interface'i implemente eder.
 */

export interface ErpShipmentData {
  shipperRef: string;
  originAddress: string;
  originLat: number;
  originLng: number;
  destinationAddress: string;
  destinationLat: number;
  destinationLng: number;
  cargoWeight: number;
  cargoVolume: number;
  cargoType: string;
  requiredDate: string;
  loadId: string;
}

export interface ErpInvoiceData {
  invoiceNo: string;
  invoiceType: string;
  issueDate: string;
  subtotal: number;
  vatTotal: number;
  grandTotal: number;
  currency: string;
  customerVkn: string;
  customerName: string;
}

export interface ErpPaymentData {
  loadId: string;
  amount: number;
  currency: string;
  paymentDate: string;
  referenceId: string;
}

export type ErpStatus = 'pending' | 'synced' | 'failed' | 'not_configured';

export interface ErpSyncResult {
  success: boolean;
  erpReference?: string;
  errorMessage?: string;
  status: ErpStatus;
}

export interface IErpAdapter {
  readonly erpType: string;

  /** Yeni sevkiyati ERP'ye aktar */
  createShipment(data: ErpShipmentData, config: Record<string, any>): Promise<ErpSyncResult>;

  /** Faturayi ERP'ye aktar */
  createInvoice(data: ErpInvoiceData, config: Record<string, any>): Promise<ErpSyncResult>;

  /** Odeme kaydini ERP'ye aktar */
  recordPayment(data: ErpPaymentData, config: Record<string, any>): Promise<ErpSyncResult>;

  /** ERP'deki islem durumunu sorgula */
  getStatus(referenceId: string, config: Record<string, any>): Promise<ErpStatus>;
}
