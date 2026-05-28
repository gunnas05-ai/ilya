import { create } from 'zustand';

interface AppStore {
  isOnline: boolean;
  setOnline: (val: boolean) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  isOnline: true,
  setOnline: (val) => set({ isOnline: val }),
}));
