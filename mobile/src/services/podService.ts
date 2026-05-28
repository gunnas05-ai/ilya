import { apiClient } from './api';

export interface DamageReportPayload {
  damageTypes: string[];
  driverNote: string;
  photoUrls: string[];
  latitude?: number;
  longitude?: number;
}

export interface DamageReportResponse {
  disputeId: string;
  status: string;
  reason: string;
  totalEvidenceCount: number;
  createdAt: string;
}

export const podService = {
  uploadSignature: async (
    loadId: string,
    data: {
      signatureImageBase64: string;
      signerName: string;
      signerRole?: string;
      vectorPath?: any;
      latitude?: number;
      longitude?: number;
      deviceId?: string;
    },
  ) => {
    const res = await apiClient.post(`/pod/${loadId}/signature`, data);
    return res.data;
  },

  uploadPhoto: async (
    loadId: string,
    data: { photoUrl: string; latitude?: number; longitude?: number },
  ) => {
    const res = await apiClient.post(`/pod/${loadId}/photo`, data);
    return res.data;
  },

  submitDamageReport: async (
    loadId: string,
    payload: DamageReportPayload,
  ): Promise<DamageReportResponse> => {
    const res = await apiClient.post(`/pod/${loadId}/damage-report`, payload);
    return res.data?.data || res.data;
  },
};
