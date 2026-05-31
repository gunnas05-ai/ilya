import { create } from 'zustand';
import { apiClient } from '../services/api';
import { CarrierProfile, REQUIRED_FIELDS } from '../types/carrier';

interface CarrierState {
  profile: CarrierProfile | null;
  completionPercent: number;
  missingFields: string[];
  loaded: boolean;
  loading: boolean;
  loadProfile: () => Promise<void>;
  saveProfile: (profile: Partial<CarrierProfile>) => Promise<void>;
  refreshCompletion: () => void;
}

export const useCarrierStore = create<CarrierState>((set, get) => ({
  profile: null,
  completionPercent: 0,
  missingFields: [],
  loaded: false,
  loading: false,

  loadProfile: async () => {
    set({ loading: true });
    try {
      const res = await apiClient.get('/users/me');
      const user = res.data.data?.user;
      if (user) {
        const profile: CarrierProfile = {
          companyName: user.companyTitle || user.companyName || '',
          licenseNumber: user.licenseNumber || '',
          plateNumber: user.plateNumber || '',
          vehicleType: user.vehicleType || '',
          vehicleCapacity: user.vehicleCapacity || '',
          tonnageCapacity: user.tonnageCapacity || 0,
          volumeCapacity: user.volumeCapacity || 0,
          kBelgesi: user.kBelgesi || '',
          srcBelgesi: user.srcBelgesi || '',
          iban: user.iban || '',
          taxNumber: user.taxNumber || '',
          taxOffice: user.taxOffice || '',
          escrowAccountVerified: user.escrowAccountVerified || false,
          phone: user.phone || '',
          email: user.email || '',
          tcKimlikNo: user.tcKimlikNo || '',
          isIdentityVerified: user.isIdentityVerified || false,
          vehicleHeight: user.truckProfile?.height || user.vehicleHeight || 400,
          vehicleWidth: user.truckProfile?.width || user.vehicleWidth || 250,
          vehicleLength: user.truckProfile?.length || user.vehicleLength || 1650,
          totalWeight: user.truckProfile?.totalWeight || user.totalWeight || 25000,
          axleWeight: user.truckProfile?.axleWeight || user.axleWeight || 11500,
          adrClass: user.truckProfile?.adrClass || user.adrClass || '',
          trailerType: user.truckProfile?.trailerType || user.trailerType || 'Tenteli',
          hasRefrigeration: user.truckProfile?.hasRefrigeration || false,
          accountantName: user.accountantName || '',
          accountantEmail: user.accountantEmail || '',
          accountantPhone: user.accountantPhone || '',
        };
        const completion = res.data.data?.profileCompletion || 0;
        const missing = res.data.data?.missingFields || [];
        set({
          profile,
          completionPercent: completion,
          missingFields: missing,
          loaded: true,
          loading: false,
        });
      } else {
        set({ loaded: true, loading: false });
      }
    } catch {
      set({ loaded: true, loading: false });
    }
  },

  saveProfile: async (data) => {
    const res = await apiClient.put('/users/profile', data);
    const user = res.data;
    set({ profile: user ? { ...get().profile, ...user } : null });
    await get().loadProfile();
  },

  refreshCompletion: () => {
    const profile = get().profile;
    if (!profile) {
      set({ completionPercent: 0, missingFields: REQUIRED_FIELDS.map((f) => f.toString()) });
      return;
    }
    const filled = REQUIRED_FIELDS.filter((f) => {
      const val = profile[f];
      return val !== undefined && val !== null && (typeof val === 'string' ? val.trim() !== '' : typeof val === 'number' && val > 0);
    }).length;
    const pct = Math.round((filled / REQUIRED_FIELDS.length) * 100);
    const fieldLabels: Record<string, string> = {
      licenseNumber: 'Ehliyet Bilgisi',
      plateNumber: 'Araç Plakası',
      vehicleType: 'Araç Tipi',
      vehicleCapacity: 'Araç Kapasitesi',
      tonnageCapacity: 'Tonaj Bilgisi',
      volumeCapacity: 'Hacim Bilgisi',
      kBelgesi: 'K Belgesi',
      srcBelgesi: 'SRC Belgesi',
      iban: 'IBAN',
      taxNumber: 'Vergi Bilgisi',
    };
    const missing = REQUIRED_FIELDS.filter(
      (f) => !profile[f] || (typeof profile[f] === 'string' && profile[f].trim() === ''),
    ).map((f) => fieldLabels[f] || f.toString());
    set({ completionPercent: pct, missingFields: missing });
  },
}));
