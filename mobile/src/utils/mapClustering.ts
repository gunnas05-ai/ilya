/**
 * Harita Marker Kumeleme (Clustering) Utility
 *
 * Cok sayida marker'i grid bazli gruplayarak performansi artirir.
 * O(n) karmasiklik.
 */

export interface ClusterPoint {
  id: string;
  latitude: number;
  longitude: number;
  data?: any;
}

export interface Cluster {
  id: string;
  latitude: number;
  longitude: number;
  count: number;
  points: ClusterPoint[];
  bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
}

/**
 * Grid-tabanli marker kumeleme.
 * @param points — Tum noktalar
 * @param gridSizeKm — Grid hucre boyutu (km)
 * @returns Kumelenmis noktalar (count=1 olanlar tekil marker)
 */
export function clusterMarkers(
  points: ClusterPoint[],
  gridSizeKm: number = 5,
): Cluster[] {
  if (points.length === 0) return [];

  // Grid boyutunu dereceye cevir (yaklasik: 1° ≈ 111 km)
  const gridSizeDeg = gridSizeKm / 111;
  const grid: Map<string, Cluster> = new Map();

  for (const point of points) {
    const gridLat = Math.floor(point.latitude / gridSizeDeg);
    const gridLng = Math.floor(point.longitude / gridSizeDeg);
    const key = `${gridLat}:${gridLng}`;

    const existing = grid.get(key);
    if (existing) {
      existing.count++;
      existing.points.push(point);
      existing.latitude =
        (existing.latitude * (existing.count - 1) + point.latitude) / existing.count;
      existing.longitude =
        (existing.longitude * (existing.count - 1) + point.longitude) / existing.count;
      existing.bounds.minLat = Math.min(existing.bounds.minLat, point.latitude);
      existing.bounds.maxLat = Math.max(existing.bounds.maxLat, point.latitude);
      existing.bounds.minLng = Math.min(existing.bounds.minLng, point.longitude);
      existing.bounds.maxLng = Math.max(existing.bounds.maxLng, point.longitude);
    } else {
      grid.set(key, {
        id: key,
        latitude: point.latitude,
        longitude: point.longitude,
        count: 1,
        points: [point],
        bounds: {
          minLat: point.latitude,
          maxLat: point.latitude,
          minLng: point.longitude,
          maxLng: point.longitude,
        },
      });
    }
  }

  return Array.from(grid.values());
}

/**
 * Zoom seviyesine gore adaptif grid buyuklugu.
 * Yakin zoom → kucuk grid (daha cok detay)
 * Uzak zoom → buyuk grid (daha cok kumeleme)
 */
export function getGridSizeForZoom(zoom: number): number {
  if (zoom >= 14) return 0.5;  // Sokak seviyesi
  if (zoom >= 12) return 2;    // Mahalle seviyesi
  if (zoom >= 10) return 5;    // Ilce seviyesi
  if (zoom >= 8) return 20;    // Il seviyesi
  if (zoom >= 6) return 50;    // Bolge seviyesi
  return 100;                   // Ulke seviyesi
}
