/**
 * Offline Harita Onbellekleme (E-48)
 *
 * Harita döşemelerini (tiles) AsyncStorage'da saklayarak çevrimdışı kullanım sağlar.
 * Kullanilan dösemeler otomatik olarak cache'lenir, çevrimdışıyken cache'den okunur.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const TILE_CACHE_PREFIX = '@map_tile_';
const TILE_CACHE_INDEX = '@map_tile_index';
const MAX_CACHED_TILES = 2000; // Maksimum döseme sayisi
const TILE_EXPIRY_MS = 7 * 24 * 3600 * 1000; // 7 gün

interface TileEntry {
  url: string;
  data: string; // base64 encoded
  cachedAt: number;
  size: number;
}

/**
 * Harita dösemesini cache'le (OSM/Google Maps URL'leri)
 */
export async function cacheTile(url: string, base64Data: string): Promise<void> {
  try {
    const index = await getTileIndex();

    // Limit kontrolü — eski dösemeleri temizle
    if (index.length >= MAX_CACHED_TILES) {
      const sorted = [...index].sort((a, b) => a.cachedAt - b.cachedAt);
      const toRemove = sorted.slice(0, Math.floor(MAX_CACHED_TILES * 0.2)); // %20 temizle
      for (const entry of toRemove) {
        await AsyncStorage.removeItem(TILE_CACHE_PREFIX + entry.url);
      }
      const remaining = sorted.slice(toRemove.length);
      await AsyncStorage.setItem(TILE_CACHE_INDEX, JSON.stringify(remaining));
    }

    const entry: TileEntry = {
      url,
      data: base64Data,
      cachedAt: Date.now(),
      size: base64Data.length,
    };

    await AsyncStorage.setItem(TILE_CACHE_PREFIX + url, JSON.stringify(entry));

    // Index'e ekle
    const existing = index.findIndex((e) => e.url === url);
    if (existing >= 0) index.splice(existing, 1);
    index.push({ url, cachedAt: entry.cachedAt, size: entry.size, data: '' });
    await AsyncStorage.setItem(TILE_CACHE_INDEX, JSON.stringify(index));
  } catch {
    // Sessizce devam et — cache best-effort
  }
}

/**
 * Cache'den döseme getir
 */
export async function getCachedTile(url: string): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(TILE_CACHE_PREFIX + url);
    if (!raw) return null;

    const entry: TileEntry = JSON.parse(raw);

    // Süre kontrolü
    if (Date.now() - entry.cachedAt > TILE_EXPIRY_MS) {
      await AsyncStorage.removeItem(TILE_CACHE_PREFIX + url);
      return null;
    }

    return entry.data;
  } catch {
    return null;
  }
}

/**
 * Belirli bir bölgenin dösemelerini önceden indir (opsiyonel)
 * @param bounds — { minLat, maxLat, minLng, maxLng }
 * @param minZoom — Minimum zoom seviyesi
 * @param maxZoom — Maksimum zoom seviyesi
 */
export async function preloadAreaTiles(
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  minZoom: number,
  maxZoom: number,
  tileUrlTemplate: string = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
): Promise<{ total: number; cached: number; skipped: number }> {
  let total = 0;
  let cached = 0;
  let skipped = 0;

  for (let z = minZoom; z <= maxZoom; z++) {
    const tiles = getTileCoordinates(bounds, z);
    total += tiles.length;

    for (const { x, y } of tiles) {
      const url = tileUrlTemplate.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y));

      const existing = await getCachedTile(url);
      if (existing) {
        skipped++;
        continue;
      }

      try {
        const response = await fetch(url);
        if (response.ok) {
          const blob = await response.blob();
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          await cacheTile(url, base64);
          cached++;
        }
      } catch {
        // Network hatasi — cevrimdisi
      }
    }
  }

  return { total, cached, skipped };
}

/**
 * Cache istatistikleri
 */
export async function getCacheStats(): Promise<{ tileCount: number; totalSizeMB: number }> {
  try {
    const index = await getTileIndex();
    return {
      tileCount: index.length,
      totalSizeMB: Math.round((index.reduce((s, e) => s + e.size, 0) / (1024 * 1024)) * 100) / 100,
    };
  } catch {
    return { tileCount: 0, totalSizeMB: 0 };
  }
}

/**
 * Tüm cache'i temizle
 */
export async function clearCache(): Promise<void> {
  try {
    const index = await getTileIndex();
    const keys = index.map((e) => TILE_CACHE_PREFIX + e.url);
    await AsyncStorage.multiRemove([...keys, TILE_CACHE_INDEX]);
  } catch {
    // ignore
  }
}

// ── Private helpers ──

interface TileIndexEntry {
  url: string;
  cachedAt: number;
  size: number;
  data: string;
}

async function getTileIndex(): Promise<TileIndexEntry[]> {
  const raw = await AsyncStorage.getItem(TILE_CACHE_INDEX);
  return raw ? JSON.parse(raw) : [];
}

interface TileCoord {
  x: number;
  y: number;
}

function getTileCoordinates(
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  zoom: number,
): TileCoord[] {
  const tiles: TileCoord[] = [];

  const minTile = latLngToTile(bounds.minLat, bounds.minLng, zoom);
  const maxTile = latLngToTile(bounds.maxLat, bounds.maxLng, zoom);

  for (let x = Math.min(minTile.x, maxTile.x); x <= Math.max(minTile.x, maxTile.x); x++) {
    for (let y = Math.min(minTile.y, maxTile.y); y <= Math.max(minTile.y, maxTile.y); y++) {
      tiles.push({ x, y });
    }
  }

  return tiles;
}

function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const y = Math.floor(
    ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * n,
  );
  return { x, y };
}
