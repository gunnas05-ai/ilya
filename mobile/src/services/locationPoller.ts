/**
 * Adaptif GPS Konum Polling Servisi
 *
 * Hareket halinde 5 saniyede bir, park halinde 60 saniyede bir
 * konum gonderir. Batarya tuketimini optimize eder.
 */

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { apiClient } from './api';

const BACKGROUND_TASK_NAME = 'kaptan-location-poll';

interface LocationState {
  isMoving: boolean;
  lastLat: number | null;
  lastLng: number | null;
  lastSpeed: number | null;
  intervalMs: number;
  intervalId: ReturnType<typeof setInterval> | null;
  shipmentId: string | null;
}

const state: LocationState = {
  isMoving: false,
  lastLat: null,
  lastLng: null,
  lastSpeed: null,
  intervalMs: 5000,
  intervalId: null,
  shipmentId: null,
};

const SPEED_THRESHOLD_KMH = 5; // 5 km/h uzeri → hareket halinde
const MOVING_INTERVAL = 5000;  // 5 saniye
const PARKED_INTERVAL = 60000; // 60 saniye

export function getMovingInterval(): number { return MOVING_INTERVAL; }
export function getParkedInterval(): number { return PARKED_INTERVAL; }
export function isPollingActive(): boolean { return state.intervalId !== null; }

export async function startLocationPolling(shipmentId: string): Promise<void> {
  if (state.intervalId) return; // Zaten polling yapiliyor

  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    console.warn('[LocationPoller] Konum izni verilmedi');
    return;
  }

  state.shipmentId = shipmentId;

  // Ilk konumu hemen al
  await pollLocation();

  // Periyodik polling baslat
  state.intervalId = setInterval(pollLocation, state.intervalMs);

  // Arka plan task tanimla
  TaskManager.defineTask(BACKGROUND_TASK_NAME, async (taskData: any) => {
    if (taskData.error) return;
    const locations = taskData.data?.locations;
    if (locations?.[0]) {
      await sendLocationToServer(
        locations[0].coords.latitude,
        locations[0].coords.longitude,
        locations[0].coords.speed || 0,
        locations[0].coords.heading || 0,
        locations[0].coords.accuracy || 0,
      );
    }
  });

  await Location.startLocationUpdatesAsync(BACKGROUND_TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: MOVING_INTERVAL,
    distanceInterval: 50, // 50 metre
    foregroundService: {
      notificationTitle: 'KAPTAN Konum Takibi',
      notificationBody: 'Yukunuzun konumu paylasiliyor...',
    },
  });
}

export function stopLocationPolling(): void {
  if (state.intervalId) {
    clearInterval(state.intervalId);
    state.intervalId = null;
  }
  state.shipmentId = null;

  Location.stopLocationUpdatesAsync(BACKGROUND_TASK_NAME).catch(() => {});
}

async function pollLocation(): Promise<void> {
  try {
    const pos = await Location.getCurrentPositionAsync({
      accuracy: state.isMoving ? Location.Accuracy.High : Location.Accuracy.Balanced,
    });

    const { latitude, longitude, speed, heading, accuracy } = pos.coords;
    state.lastLat = latitude;
    state.lastLng = longitude;
    state.lastSpeed = speed ?? 0;

    await sendLocationToServer(latitude, longitude, speed ?? 0, heading ?? 0, accuracy ?? 10);

    // Adaptif interval ayari
    updatePollingInterval(speed ?? 0);
  } catch {
    // Konum alinamadi — bir sonraki interval'da tekrar dene
  }
}

function updatePollingInterval(speed: number): void {
  const wasMoving = state.isMoving;
  state.isMoving = speed > SPEED_THRESHOLD_KMH;
  const newInterval = state.isMoving ? MOVING_INTERVAL : PARKED_INTERVAL;

  if (state.isMoving !== wasMoving) {
    state.intervalMs = newInterval;
    if (state.intervalId) {
      clearInterval(state.intervalId);
      state.intervalId = setInterval(pollLocation, newInterval);
    }
    console.log(`[LocationPoller] Interval: ${newInterval / 1000}s (${state.isMoving ? 'hareket' : 'park'})`);
  }
}

async function sendLocationToServer(
  lat: number, lng: number, speed: number, heading: number, accuracy: number,
): Promise<void> {
  if (!state.shipmentId) return;

  try {
    await apiClient.post(`/tracking`, {
      loadId: state.shipmentId,
      latitude: lat,
      longitude: lng,
      speed,
      heading,
      accuracy,
      timestamp: new Date().toISOString(),
    });
  } catch {
    // Offline → offlineQueue'ya yazilir
    const { queueRequest } = require('./offlineQueue');
    await queueRequest('/tracking', 'POST', {
      loadId: state.shipmentId,
      latitude: lat,
      longitude: lng,
      speed,
      heading,
      accuracy,
      timestamp: new Date().toISOString(),
    });
  }
}
