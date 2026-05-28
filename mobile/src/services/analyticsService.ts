import { apiClient } from './api';

export interface ShipperDashboard {
  totalLoads: number; activeLoads: number; completedLoads: number;
  totalSpent: number; avgPrice: number;
  topLanes: Array<{ lane: string; count: number; avgPrice: number }>;
  trend: Array<{ month: string; count: number; total: number }>;
}

export interface LaneAnalytics {
  lanes: Array<{
    lane: string; totalLoads: number; avgPrice: number;
    minPrice: number; maxPrice: number; completionRate: number; delayRate: number;
  }>;
  totalLanes: number;
}

export interface LoadExportRow {
  id: string; loadNo: string; title: string; loadType: string;
  fromCity: string; toCity: string; totalPrice: number; status: string; createdAt: string;
}

export interface InvoiceExportRow {
  id: string; invoiceNo: string; invoiceType: string; vatTotal: number;
  grandTotal: number; status: string; issueDate: string;
}

export interface ExpenseExportRow {
  id: string; vendorName: string; amount: number; date: string; categoryId: string;
}

export const analyticsService = {
  getShipperDashboard: async (): Promise<ShipperDashboard> => {
    const res = await apiClient.get('/analytics/shipper-dashboard');
    return res.data?.data || res.data;
  },

  getLaneAnalytics: async (): Promise<LaneAnalytics> => {
    const res = await apiClient.get('/analytics/lane-analytics');
    return res.data?.data || res.data;
  },

  getExportUrl: (type: string) => `${apiClient.defaults.baseURL}/analytics/export?type=${type}`,

  /** Fetch full load data for PDF reports via export endpoint */
  fetchExportData: async (type: string): Promise<string> => {
    const res = await apiClient.get(`/analytics/export?type=${type}`, {
      responseType: 'text',
      headers: { Accept: 'text/csv' },
    });
    return res.data;
  },

  /** Parse CSV string into typed objects for report generation */
  parseCSV: (csv: string): Record<string, string>[] => {
    const lines = csv.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
      const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
      const row: Record<string, string> = {};
      headers.forEach((h, i) => {
        let val = (values[i] || '').trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        row[h] = val;
      });
      return row;
    });
  },
};
