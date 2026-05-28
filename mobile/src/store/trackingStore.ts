import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LoadTracking, LoadStatus, TrackingPoint } from '../types/tracking';
import { queueRequest } from '../services/offlineQueue';

const TRACKING_KEY = '@load_tracking';

interface TrackingState {
  trackedLoads: Record<string, LoadTracking>;
  loaded: boolean;
  loadTracking: () => Promise<void>;
  addTrackedLoad: (load: LoadTracking) => Promise<void>;
  updateLocation: (loadId: string, point: TrackingPoint) => Promise<void>;
  updateStatus: (loadId: string, status: LoadStatus) => Promise<void>;
  verifyDelivery: (loadId: string, method: 'qr' | 'photo' | 'otp' | 'gps') => Promise<void>;
  getLoadsByCreator: (creatorId: string) => LoadTracking[];
  getLoadsByReceiver: (receiverId: string) => LoadTracking[];
  getLoad: (loadId: string) => LoadTracking | undefined;
}

export const useTrackingStore = create<TrackingState>((set, get) => ({
  trackedLoads: {},
  loaded: false,

  loadTracking: async () => {
    try {
      const raw = await AsyncStorage.getItem(TRACKING_KEY);
      if (raw) {
        set({ trackedLoads: JSON.parse(raw), loaded: true });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  addTrackedLoad: async (load) => {
    const { trackedLoads } = get();
    const updated = { ...trackedLoads, [load.loadId]: load };
    set({ trackedLoads: updated });
    await AsyncStorage.setItem(TRACKING_KEY, JSON.stringify(updated));
  },

  updateLocation: async (loadId, point) => {
    const { trackedLoads } = get();
    const load = trackedLoads[loadId];
    if (!load) return;
    const updated = {
      ...trackedLoads,
      [loadId]: { ...load, currentLocation: point, updatedAt: point.timestamp },
    };
    set({ trackedLoads: updated });
    await AsyncStorage.setItem(TRACKING_KEY, JSON.stringify(updated));
    
    // Offline-first request to backend
    await queueRequest('/tracking/update', 'POST', { loadId, point });
  },

  updateStatus: async (loadId, status) => {
    const { trackedLoads } = get();
    const load = trackedLoads[loadId];
    if (!load) return;
    const updated = {
      ...trackedLoads,
      [loadId]: { ...load, status, updatedAt: new Date().toISOString() },
    };
    set({ trackedLoads: updated });
    await AsyncStorage.setItem(TRACKING_KEY, JSON.stringify(updated));
  },

  verifyDelivery: async (loadId, method) => {
    const { trackedLoads } = get();
    const load = trackedLoads[loadId];
    if (!load) return;
    const updated = {
      ...trackedLoads,
      [loadId]: {
        ...load,
        deliveryVerified: true,
        deliveryVerificationMethod: method,
        updatedAt: new Date().toISOString(),
      },
    };
    set({ trackedLoads: updated });
    await AsyncStorage.setItem(TRACKING_KEY, JSON.stringify(updated));
  },

  getLoadsByCreator: (creatorId) => {
    return Object.values(get().trackedLoads).filter(
      (l) => l.creatorId === creatorId
    );
  },

  getLoadsByReceiver: (receiverId) => {
    return Object.values(get().trackedLoads).filter(
      (l) => l.receiverId === receiverId
    );
  },

  getLoad: (loadId) => {
    return get().trackedLoads[loadId];
  },
}));
