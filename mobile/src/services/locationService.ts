import * as Location from 'expo-location';
import { CITIES } from '../constants/cities';

export interface LocationResult {
  cityId: string | null;
  cityName: string;
  districtName: string | null;
  address: string;
  latitude: number;
  longitude: number;
}

function normalize(str: string): string {
  return str
    .toLocaleLowerCase('tr-TR')
    .replace(/[ı]/g, 'i')
    .replace(/[ğ]/g, 'g')
    .replace(/[ü]/g, 'u')
    .replace(/[ş]/g, 's')
    .replace(/[ö]/g, 'o')
    .replace(/[ç]/g, 'c')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function findCityId(cityName: string): string | null {
  const normalizedInput = normalize(cityName);
  for (const city of CITIES) {
    if (normalize(city.name) === normalizedInput) return city.id;
  }
  // partial match fallback
  for (const city of CITIES) {
    if (normalizedInput.includes(normalize(city.name)) || normalize(city.name).includes(normalizedInput)) {
      return city.id;
    }
  }
  return null;
}

function findDistrictName(cityId: string, districtName: string): string | null {
  const city = CITIES.find((c) => c.id === cityId);
  if (!city) return null;
  const normalizedInput = normalize(districtName);
  for (const d of city.districts) {
    if (normalize(d.name) === normalizedInput) return d.name;
  }
  // partial match fallback
  for (const d of city.districts) {
    if (normalizedInput.includes(normalize(d.name)) || normalize(d.name).includes(normalizedInput)) {
      return d.name;
    }
  }
  return districtName;
}

function buildAddress(geocode: Location.LocationGeocodedAddress): string {
  const parts: string[] = [];
  if (geocode.street) parts.push(geocode.street);
  if (geocode.name) parts.push(geocode.name);
  if (geocode.district) parts.push(geocode.district);
  if (geocode.city) parts.push(geocode.city);
  if (geocode.postalCode) parts.push(geocode.postalCode);
  return parts.join(', ');
}

export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function getCurrentLocation(): Promise<LocationResult> {
  const hasPermission = await requestLocationPermission();
  if (!hasPermission) {
    throw new Error('Konum izni verilmedi');
  }

  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  const { latitude, longitude } = pos.coords;

  const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });

  if (!geocode || geocode.length === 0) {
    throw new Error('Adres bilgisi alınamadı');
  }

  const loc = geocode[0];
  const cityName = loc.city || loc.region || '';
  const cityId = findCityId(cityName);

  let districtName: string | null = null;
  if (cityId && loc.district) {
    districtName = findDistrictName(cityId, loc.district);
  } else if (loc.district) {
    districtName = loc.district;
  }

  const address = buildAddress(loc);

  return {
    cityId,
    cityName,
    districtName,
    address,
    latitude,
    longitude,
  };
}
