import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = '@theme_mode';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  loaded: boolean;
  loadTheme: () => Promise<void>;
  setMode: (mode: ThemeMode) => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'system',
  loaded: false,

  loadTheme: async () => {
    try {
      const raw = await AsyncStorage.getItem(THEME_KEY);
      if (raw === 'light' || raw === 'dark' || raw === 'system') {
        set({ mode: raw, loaded: true });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  setMode: async (mode) => {
    set({ mode });
    await AsyncStorage.setItem(THEME_KEY, mode);
  },
}));
