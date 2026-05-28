import { apiClient } from './api';

export interface GibCustomer {
  id?: string;
  type: 'bireysel' | 'kurumsal';
  vknTckn: string;
  name: string;
  address: string;
  taxOffice?: string;
  email?: string;
  phone?: string;
}

export interface InvoiceItemInput {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discountPct?: number;
  vatRate: number;
  withholdingRate?: number;
  productCode?: string;
}

export interface InvoiceCreateInput {
  invoiceType: string;
  customerId?: string;
  senderJson: string;
  receiverJson: string;
  scenario?: string;
  orderNo?: string;
  issueDate?: string;
  dueDate?: string;
  plateNumber?: string;
  driverTcNo?: string;
  shippingAddress?: string;
  transportType?: string;
  items: InvoiceItemInput[];
}

export const gibService = {
  // Invoice CRUD
  create: async (data: InvoiceCreateInput) => {
    const res = await apiClient.post('/invoice/create', data);
    return res.data;
  },

  getAll: async (params?: {
    status?: string;
    invoiceType?: string;
    page?: number;
    limit?: number;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  }) => {
    const res = await apiClient.get('/invoice', { params });
    return res.data;
  },

  getById: async (id: string) => {
    const res = await apiClient.get(`/invoice/${id}`);
    return res.data;
  },

  // Workflow
  preview: async (id: string) => {
    const res = await apiClient.post(`/invoice/${id}/preview`);
    return res.data;
  },

  approve: async (id: string) => {
    const res = await apiClient.post(`/invoice/${id}/approve`);
    return res.data;
  },

  sendToGib: async (id: string) => {
    const res = await apiClient.post(`/invoice/${id}/send-gib`);
    return res.data;
  },

  cancel: async (id: string) => {
    const res = await apiClient.post(`/invoice/${id}/cancel`);
    return res.data;
  },

  // Documents
  getPdfUrl: (id: string) => `/invoice/pdf/${id}`,
  getXmlUrl: (id: string) => `/invoice/xml/${id}`,
  getQr: async (id: string) => {
    const res = await apiClient.get(`/invoice/qr/${id}`);
    return res.data;
  },
  getLogs: async (id: string) => {
    const res = await apiClient.get(`/invoice/${id}/logs`);
    return res.data;
  },

  // EX-009: Muhasebeci entegrasyonu

  /** Send invoice PDF+XML to accountant */
  sendToAccountant: async (id: string, accountantEmail?: string) => {
    const res = await apiClient.post(`/invoice/${id}/send-accountant`, { accountantEmail });
    return res.data;
  },

  /** Accountant: get pending invoices across all clients */
  getAccountantInvoices: async (params?: { status?: string; page?: number; limit?: number }) => {
    const res = await apiClient.get('/invoice/accountant/pending', { params });
    return res.data;
  },

  /** Accountant: KDV summary report */
  getAccountantKDVSummary: async () => {
    const res = await apiClient.get('/invoice/accountant/kdv-summary');
    return res.data;
  },

  // Customers
  getFrequentCustomers: async () => {
    const res = await apiClient.get('/invoice/customer/frequent');
    return res.data;
  },
  addCustomer: async (data: GibCustomer) => {
    const res = await apiClient.post('/invoice/customer/frequent', data);
    return res.data;
  },
};
