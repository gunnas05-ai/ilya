import { LoadTracking, TrackingPoint, LoadStatus } from '../types/tracking';
import { CITIES } from '../constants/cities';

// Approximate city centers (lat/lng) for distance calculations
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  '01': { lat: 37.0, lng: 35.3213 },
  '06': { lat: 39.9334, lng: 32.8597 },
  '07': { lat: 36.8841, lng: 30.7056 },
  '16': { lat: 40.2669, lng: 29.0634 },
  '34': { lat: 41.0082, lng: 28.9784 },
  '35': { lat: 38.4192, lng: 27.1287 },
  '41': { lat: 40.7655, lng: 29.9408 },
  '42': { lat: 37.8667, lng: 32.4831 },
};

function getDefaultCoords(cityId: string): { lat: number; lng: number } {
  return CITY_COORDS[cityId] || { lat: 39.0, lng: 35.0 };
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

/**
 * Akilli ETA hesaplama — trafik, hava durumu ve AETR mola zorunlulugunu icerir.
 *
 * Faktorler:
 *   - Trafik yogunlugu: %0-30 yavaslama (varsayilan %10)
 *   - Hava durumu: yagmur %15, kar/buz %30 yavaslama
 *   - AETR molasi: her 4.5 saatte 45 dakika zorunlu mola
 *   - Ortalama TIR hizi: 70 km/h (otoyol), 55 km/h (bölünmüs yol), 40 km/h (sehir ici)
 */
export interface EtaInput {
  distanceKm: number;
  roadType?: 'highway' | 'divided' | 'urban';
  trafficFactor?: number;   // 0.0 - 0.30
  weatherCondition?: 'clear' | 'rain' | 'snow' | 'fog';
  includeRestBreaks?: boolean;
}

export interface EtaResult {
  drivingHours: number;
  totalHours: number;
  restBreaks: number;
  avgSpeedUsed: number;
  displayText: string;
  arrivalEstimate: string;
}

export function calculateSmartETA(input: EtaInput): EtaResult {
  const {
    distanceKm,
    roadType = 'highway',
    trafficFactor = 0.10,
    weatherCondition = 'clear',
    includeRestBreaks = true,
  } = input;

  // Taban hiz (yol tipine gore)
  const baseSpeeds = { highway: 70, divided: 55, urban: 40 };
  let avgSpeed = baseSpeeds[roadType] || 70;

  // Trafik faktoru
  avgSpeed *= (1 - Math.min(trafficFactor, 0.50));

  // Hava durumu faktoru
  const weatherFactors = { clear: 0, rain: 0.15, snow: 0.30, fog: 0.20 };
  avgSpeed *= (1 - weatherFactors[weatherCondition]);

  // Saf surus suresi
  const drivingHours = distanceKm / avgSpeed;

  // AETR zorunlu molalar (her 4.5 saat suruste 45 dakika mola)
  let restHours = 0;
  let restBreaks = 0;
  if (includeRestBreaks) {
    restBreaks = Math.floor(drivingHours / 4.5);
    restHours = restBreaks * 0.75; // her mola 45 dakika
  }

  const totalHours = drivingHours + restHours;
  const arrivalDate = new Date(Date.now() + totalHours * 3600 * 1000);

  // Display text
  const h = Math.floor(totalHours);
  const m = Math.round((totalHours - h) * 60);

  let displayText: string;
  if (totalHours < 1) {
    displayText = `${Math.round(totalHours * 60)} dk`;
  } else {
    displayText = `${h} sa ${m} dk`;
  }
  if (restBreaks > 0) {
    displayText += ` (${restBreaks} mola dahil)`;
  }

  return {
    drivingHours: Math.round(drivingHours * 10) / 10,
    totalHours: Math.round(totalHours * 10) / 10,
    restBreaks,
    avgSpeedUsed: Math.round(avgSpeed),
    displayText,
    arrivalEstimate: arrivalDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
  };
}

/** Basit ETA (geriye donuk uyumluluk) */
export function estimateTravelTime(distanceKm: number): string {
  const result = calculateSmartETA({ distanceKm, includeRestBreaks: true });
  return result.displayText;
}

function getCityCoords(cityId: string): { lat: number; lng: number } {
  return getDefaultCoords(cityId);
}

export function createTrackingFromLoad(
  loadId: string,
  formData: any,
  creatorId: string,
  receiverId: string | null
): LoadTracking {
  const fromCoords = getCityCoords(formData.fromCity || '');
  const toCoords = getCityCoords(formData.toCity || '');

  // Simulate current location near pickup initially
  const currentLocation: TrackingPoint = {
    latitude: fromCoords.lat + (Math.random() - 0.5) * 0.05,
    longitude: fromCoords.lng + (Math.random() - 0.5) * 0.05,
    timestamp: new Date().toISOString(),
    label: 'Yükleme Noktası',
  };

  const pickupLocation: TrackingPoint = {
    latitude: fromCoords.lat,
    longitude: fromCoords.lng,
    timestamp: new Date().toISOString(),
    label: 'Alınacak Nokta',
  };

  const deliveryLocation: TrackingPoint = {
    latitude: toCoords.lat,
    longitude: toCoords.lng,
    timestamp: new Date().toISOString(),
    label: 'Teslim Noktası',
  };

  const totalDistance = calculateDistance(
    fromCoords.lat,
    fromCoords.lng,
    toCoords.lat,
    toCoords.lng
  );

  const fromCityName = getCityName(formData.fromCity);
  const toCityName = getCityName(formData.toCity);
  const fromDistrictName = getDistrictName(formData.fromCity, formData.fromDistrict);
  const toDistrictName = getDistrictName(formData.toCity, formData.toDistrict);

  return {
    id: loadId,
    loadId,
    title: formData.title || 'Yük',
    creatorId,
    receiverId,
    deliveryVerified: false,
    status: 'beklemede',
    pickupLocation,
    deliveryLocation,
    currentLocation,
    estimatedArrival: estimateTravelTime(totalDistance),
    distanceToCreator: 0,
    distanceToReceiver: receiverId ? totalDistance : undefined,
    updatedAt: new Date().toISOString(),
    loadType: formData.loadType || '',
    route: {
      fromCity: `${fromCityName}${fromDistrictName ? ' / ' + fromDistrictName : ''}`,
      fromDistrict: fromDistrictName,
      toCity: `${toCityName}${toDistrictName ? ' / ' + toDistrictName : ''}`,
      toDistrict: toDistrictName,
    },
    tonnage: formData.tonnage,
    volume: formData.volume,
    vehicleType: formData.vehicleType,
    trailerType: formData.trailerType,
    coldChain: formData.coldChain,
    urgency: formData.urgency,
    insurance: formData.insurance,
    insurancePackage: formData.insurancePackage,
    totalPrice: formData.totalPrice || formData.auctionMaxPrice,
  };
}

function getCityName(cityId?: string): string {
  if (!cityId) return '';
  const city = CITIES.find((c) => c.id === cityId);
  return city?.name ?? cityId;
}

function getDistrictName(cityId?: string, districtId?: string): string {
  if (!cityId || !districtId) return '';
  const city = CITIES.find((c) => c.id === cityId);
  const district = city?.districts.find((d) => d.id === districtId);
  return district?.name ?? '';
}

// Simulate GPS movement - progresses the load location from pickup toward delivery
export function simulateLoadProgress(tracking: LoadTracking, progress: number): LoadTracking {
  const clamped = Math.max(0, Math.min(1, progress));
  const lat =
    tracking.pickupLocation.latitude +
    (tracking.deliveryLocation.latitude - tracking.pickupLocation.latitude) * clamped;
  const lng =
    tracking.pickupLocation.longitude +
    (tracking.deliveryLocation.longitude - tracking.pickupLocation.longitude) * clamped;

  const newStatus: LoadStatus = clamped <= 0 ? 'beklemede' : clamped >= 1 ? 'teslim_edildi' : 'yolda';

  return {
    ...tracking,
    currentLocation: {
      latitude: lat,
      longitude: lng,
      timestamp: new Date().toISOString(),
      label: clamped >= 1 ? 'Teslim Edildi' : 'Yük Konumu',
    },
    status: newStatus,
    distanceToCreator: 0,
    distanceToReceiver: tracking.receiverId
      ? calculateDistance(
          lat,
          lng,
          tracking.deliveryLocation.latitude,
          tracking.deliveryLocation.longitude
        )
      : undefined,
    estimatedArrival: estimateTravelTime(
      calculateDistance(
        lat,
        lng,
        tracking.deliveryLocation.latitude,
        tracking.deliveryLocation.longitude
      )
    ),
    updatedAt: new Date().toISOString(),
  };
}
