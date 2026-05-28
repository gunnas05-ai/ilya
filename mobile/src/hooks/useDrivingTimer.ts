import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TIMER_STATE_KEY = '@driving_timer_state';

interface DrivingTimerState {
  isDriving: boolean;
  totalDrivingSeconds: number;   // Bugunku toplam surus (saniye)
  currentSessionSeconds: number; // Bu oturumdaki surus (saniye)
  lastBreakStart: number | null; // Son mola baslangic zamani (timestamp)
  dailyLimitSeconds: number;     // Gunluk limit: 9 saat (32400 sn)
  sessionLimitSeconds: number;   // Oturum limiti: 4.5 saat (16200 sn)
  breakDurationSeconds: number;  // Zorunlu mola suresi: 45 dakika (2700 sn)
  warnings: string[];
}

const DEFAULT_STATE: DrivingTimerState = {
  isDriving: false,
  totalDrivingSeconds: 0,
  currentSessionSeconds: 0,
  lastBreakStart: null,
  dailyLimitSeconds: 9 * 3600,     // 9 saat
  sessionLimitSeconds: 4.5 * 3600, // 4.5 saat
  breakDurationSeconds: 45 * 60,    // 45 dakika
  warnings: [],
};

export function useDrivingTimer() {
  const [state, setState] = useState<DrivingTimerState>(DEFAULT_STATE);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Kayitli durumu yukle
  useEffect(() => {
    AsyncStorage.getItem(TIMER_STATE_KEY).then((raw) => {
      if (raw) {
        const saved = JSON.parse(raw);
        setState((prev) => ({ ...prev, ...saved }));
      }
    });
  }, []);

  // Her saniye guncelle
  useEffect(() => {
    if (state.isDriving) {
      intervalRef.current = setInterval(() => {
        setState((prev) => {
          const newTotal = prev.totalDrivingSeconds + 1;
          const newSession = prev.currentSessionSeconds + 1;
          const warnings: string[] = [];

          // AETR uyarilari
          if (newSession >= prev.sessionLimitSeconds - 1800) {
            warnings.push(`⚠️ ${Math.ceil((prev.sessionLimitSeconds - newSession) / 60)} dk sonra zorunlu mola!`);
          }
          if (newTotal >= prev.dailyLimitSeconds - 3600) {
            warnings.push(`🛑 Gunluk limit: ${Math.ceil((prev.dailyLimitSeconds - newTotal) / 3600)} saat kaldi`);
          }
          if (newSession >= prev.sessionLimitSeconds) {
            warnings.push('🔴 4.5 saat limiti asildi! Hemen mola verin!');
          }
          if (newTotal >= prev.dailyLimitSeconds) {
            warnings.push('🚫 Gunluk 9 saat limiti asildi!');
          }

          const updated = {
            ...prev,
            totalDrivingSeconds: newTotal,
            currentSessionSeconds: newSession,
            warnings: warnings.slice(-3), // Son 3 uyari
          };

          // Periyodik kaydet (her 30 saniyede)
          if (newTotal % 30 === 0) {
            AsyncStorage.setItem(TIMER_STATE_KEY, JSON.stringify({
              totalDrivingSeconds: newTotal,
              currentSessionSeconds: newSession,
              isDriving: true,
            }));
          }

          return updated;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state.isDriving]);

  const startDriving = useCallback(() => {
    setState((prev) => ({ ...prev, isDriving: true, lastBreakStart: null }));
    AsyncStorage.setItem(TIMER_STATE_KEY, JSON.stringify({ ...state, isDriving: true }));
  }, []);

  const stopDriving = useCallback(() => {
    setState((prev) => ({ ...prev, isDriving: false, lastBreakStart: Date.now() }));
    AsyncStorage.setItem(TIMER_STATE_KEY, JSON.stringify({
      totalDrivingSeconds: state.totalDrivingSeconds,
      currentSessionSeconds: state.currentSessionSeconds,
      isDriving: false,
    }));
  }, [state.totalDrivingSeconds, state.currentSessionSeconds]);

  const takeBreak = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isDriving: false,
      currentSessionSeconds: 0, // Oturum sifirlandi
      lastBreakStart: Date.now(),
      warnings: [],
    }));
  }, []);

  const resetDaily = useCallback(() => {
    setState((prev) => ({
      ...prev,
      totalDrivingSeconds: 0,
      currentSessionSeconds: 0,
      warnings: [],
    }));
    AsyncStorage.removeItem(TIMER_STATE_KEY);
  }, []);

  // Formatlayicilar
  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}s ${m}dk`;
  };

  const sessionProgress = state.currentSessionSeconds / state.sessionLimitSeconds;
  const dailyProgress = state.totalDrivingSeconds / state.dailyLimitSeconds;

  return {
    ...state,
    sessionDisplay: formatTime(state.currentSessionSeconds),
    sessionMaxDisplay: formatTime(state.sessionLimitSeconds),
    dailyDisplay: formatTime(state.totalDrivingSeconds),
    dailyMaxDisplay: formatTime(state.dailyLimitSeconds),
    sessionProgress: Math.min(sessionProgress, 1),
    dailyProgress: Math.min(dailyProgress, 1),
    startDriving,
    stopDriving,
    takeBreak,
    resetDaily,
  };
}
