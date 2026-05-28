import { apiClient as api } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { offlineQueue } from './offlineQueue';

const CACHE_KEY = '@finance_cache';

export const financeService = {
  getDashboardSummary: async () => {
    try {
      const response = await api.get('/finance/dashboard');
      await AsyncStorage.setItem(`${CACHE_KEY}_dashboard`, JSON.stringify(response.data));
      return response.data;
    } catch (error) {
      const cached = await AsyncStorage.getItem(`${CACHE_KEY}_dashboard`);
      if (cached) return JSON.parse(cached);
      throw error;
    }
  },

  getExpenses: async () => {
    try {
      const response = await api.get('/finance/expenses');
      await AsyncStorage.setItem(`${CACHE_KEY}_expenses`, JSON.stringify(response.data));
      return response.data;
    } catch (error) {
      const cached = await AsyncStorage.getItem(`${CACHE_KEY}_expenses`);
      if (cached) return JSON.parse(cached);
      throw error;
    }
  },

  addExpense: async (expenseData: any) => {
    try {
      const response = await api.post('/finance/expenses', expenseData);
      return response.data;
    } catch (error: any) {
      if (!error.response) { // Network error -> offline queue
        await offlineQueue.enqueue({
          url: '/finance/expenses',
          method: 'POST',
          data: expenseData
        });
        return { success: true, offline: true, ...expenseData };
      }
      throw error;
    }
  },

  uploadOcrReceipt: async (fileUri: string, mimeType: string) => {
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      name: `receipt_${Date.now()}.${mimeType.split('/')[1] || 'jpg'}`,
      type: mimeType,
    } as any);
    const response = await api.post('/finance/ocr/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /** EX-017: Upload rate confirmation document for OCR */
  uploadOcrRateConfirmation: async (fileUri: string, mimeType: string) => {
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      name: `rateconf_${Date.now()}.${mimeType.split('/')[1] || 'jpg'}`,
      type: mimeType,
    } as any);
    const response = await api.post('/finance/ocr/rate-confirmation', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /** EX-017: Upload driver license image for OCR */
  uploadOcrDriverLicense: async (fileUri: string, mimeType: string) => {
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      name: `license_${Date.now()}.${mimeType.split('/')[1] || 'jpg'}`,
      type: mimeType,
    } as any);
    const response = await api.post('/finance/ocr/driver-license', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /** EX-017: Upload SRC document image for OCR */
  uploadOcrSrcDocument: async (fileUri: string, mimeType: string) => {
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      name: `src_${Date.now()}.${mimeType.split('/')[1] || 'jpg'}`,
      type: mimeType,
    } as any);
    const response = await api.post('/finance/ocr/src-document', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /** EX-017: Poll OCR result */
  getOcrResult: async (id: string) => {
    const response = await api.get(`/finance/ocr/${id}/result`);
    return response.data;
  },
};
