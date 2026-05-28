import { Injectable, Logger, BadRequestException } from '@nestjs/common';

export interface VehicleProfile {
  height: number;       // cm
  width: number;        // cm
  length: number;       // cm
  totalWeight: number;  // kg
  axleWeight: number;   // kg
  adrClass?: string;    // '1' to '9' or null
  trailerType?: string;
  hasRefrigeration?: boolean;
}

export interface RoutePoint {
  lat: number;
  lng: number;
}

// Known bridge/restriction data for Turkey major routes — comprehensive
const KNOWN_RESTRICTIONS: Array<{
  name: string;
  lat: number;
  lng: number;
  maxHeight: number;   // cm (0 = no restriction)
  maxWeight: number;   // kg (0 = no restriction)
  type: 'bridge' | 'tunnel' | 'weight_station' | 'tonnage_limit' | 'adr_restricted';
  description: string;
}> = [
  // ── İstanbul Bridges ──
  { name: '15 Temmuz Şehitler Köprüsü', lat: 41.035, lng: 28.96, maxHeight: 450, maxWeight: 40000, type: 'bridge', description: 'Yükseklik sınırı 4.5m, ağır taşıt kısıtlaması' },
  { name: 'Fatih Sultan Mehmet Köprüsü', lat: 41.091, lng: 29.062, maxHeight: 480, maxWeight: 42000, type: 'bridge', description: 'Yükseklik sınırı 4.8m' },
  { name: 'Yavuz Sultan Selim Köprüsü', lat: 41.202, lng: 29.110, maxHeight: 500, maxWeight: 44000, type: 'bridge', description: 'Yükseklik sınırı 5.0m, ağır taşıt önerilir' },
  { name: 'Osmangazi Köprüsü (İzmit Körfezi)', lat: 40.72, lng: 29.51, maxHeight: 470, maxWeight: 40000, type: 'bridge', description: 'Yükseklik sınırı 4.7m, geçiş ücretli' },
  { name: '1915 Çanakkale Köprüsü', lat: 40.34, lng: 26.63, maxHeight: 500, maxWeight: 44000, type: 'bridge', description: 'Yükseklik sınırı 5.0m' },
  { name: 'Nissibi Köprüsü (Adıyaman)', lat: 37.89, lng: 38.97, maxHeight: 420, maxWeight: 35000, type: 'bridge', description: 'Yükseklik sınırı 4.2m' },

  // ── İstanbul Tunnels ──
  { name: 'Avrasya Tüneli (ADR Yasak!)', lat: 41.005, lng: 28.99, maxHeight: 410, maxWeight: 38000, type: 'adr_restricted', description: 'Tehlikeli madde taşıyan araçlar KESİNLİKLE giremez. Yükseklik 4.1m' },
  { name: 'Dolmabahçe Tüneli', lat: 41.038, lng: 28.99, maxHeight: 380, maxWeight: 35000, type: 'tunnel', description: 'Yükseklik sınırı 3.8m, ağır taşıt kısıtlı' },
  { name: 'Kağıthane Tüneli', lat: 41.085, lng: 28.97, maxHeight: 440, maxWeight: 0, type: 'tunnel', description: 'Yükseklik sınırı 4.4m' },
  { name: 'Piyalepaşa Tüneli', lat: 41.045, lng: 28.96, maxHeight: 420, maxWeight: 0, type: 'tunnel', description: 'Yükseklik sınırı 4.2m' },

  // ── Anatolian Highway Tunnels ──
  { name: 'Bolu Dağı Tüneli', lat: 40.75, lng: 31.55, maxHeight: 460, maxWeight: 42000, type: 'tunnel', description: 'Yükseklik sınırı 4.6m, ADR saat kısıtlaması var' },
  { name: 'Kırıkkale Tüneli', lat: 40.78, lng: 31.58, maxHeight: 450, maxWeight: 40000, type: 'tunnel', description: 'Yükseklik sınırı 4.5m' },
  { name: 'Ilgaz Tüneli', lat: 41.05, lng: 33.74, maxHeight: 460, maxWeight: 0, type: 'tunnel', description: 'Yükseklik sınırı 4.6m' },
  { name: 'Kop Dağı Tüneli (Bayburt)', lat: 40.21, lng: 40.23, maxHeight: 470, maxWeight: 38000, type: 'tunnel', description: 'Yükseklik sınırı 4.7m' },
  { name: 'Zigana Tüneli (Trabzon-Gümüşhane)', lat: 40.63, lng: 39.40, maxHeight: 470, maxWeight: 38000, type: 'tunnel', description: 'Yükseklik sınırı 4.7m' },
  { name: 'Ovit Tüneli (Rize-Erzurum)', lat: 40.54, lng: 40.79, maxHeight: 470, maxWeight: 38000, type: 'tunnel', description: 'Yükseklik sınırı 4.7m' },
  { name: 'Cankurtaran Tüneli (Artvin)', lat: 41.38, lng: 41.70, maxHeight: 450, maxWeight: 35000, type: 'tunnel', description: 'Yükseklik sınırı 4.5m' },
  { name: 'Sabuncubeli Tüneli (Manisa-İzmir)', lat: 38.60, lng: 27.30, maxHeight: 480, maxWeight: 40000, type: 'tunnel', description: 'Yükseklik sınırı 4.8m' },
  { name: 'Assos Tüneli (Çanakkale)', lat: 39.50, lng: 26.15, maxHeight: 480, maxWeight: 40000, type: 'tunnel', description: 'Yükseklik sınırı 4.8m' },

  // ── City Ring Roads & Tunnels ──
  { name: 'Ankara Çevre Yolu O-20', lat: 39.87, lng: 32.72, maxHeight: 500, maxWeight: 44000, type: 'tonnage_limit', description: 'Tonaj sınırı 44 ton' },
  { name: 'İzmir Çevre Yolu O-30', lat: 38.42, lng: 27.15, maxHeight: 480, maxWeight: 42000, type: 'tonnage_limit', description: 'Tonaj sınırı 42 ton' },
  { name: 'Bursa Çevre Yolu O-22', lat: 40.22, lng: 29.08, maxHeight: 480, maxWeight: 42000, type: 'tonnage_limit', description: 'Tonaj sınırı 42 ton' },
  { name: 'İstanbul Çevre Yolu O-7', lat: 41.10, lng: 29.05, maxHeight: 480, maxWeight: 42000, type: 'tonnage_limit', description: 'Tonaj sınırı 42 ton' },
  { name: 'Adana Çevre Yolu O-50', lat: 37.00, lng: 35.32, maxHeight: 480, maxWeight: 40000, type: 'tonnage_limit', description: 'Tonaj sınırı 40 ton' },

  // ── ADR Restricted Areas ──
  { name: 'İstanbul Boğazı — ADR Geçiş Yasağı (Gündüz)', lat: 41.05, lng: 29.00, maxHeight: 0, maxWeight: 0, type: 'adr_restricted', description: 'ADR Sınıf 1 (Patlayıcı) araçlar Boğaz köprülerinden 06:00-22:00 arası geçemez' },
  { name: 'Ankara Şehir Merkezi — ADR Geçiş Yasağı', lat: 39.93, lng: 32.85, maxHeight: 0, maxWeight: 0, type: 'adr_restricted', description: 'Tüm ADR sınıfları Ankara şehir merkezine giremez, çevre yolu zorunlu' },
  { name: 'İzmir Şehir Merkezi — ADR Kısıtlaması', lat: 38.42, lng: 27.14, maxHeight: 0, maxWeight: 0, type: 'adr_restricted', description: 'ADR araçları İzmir şehir merkezine giremez' },

  // ── Weight Stations ──
  { name: 'Gebze Kantar İstasyonu (O-4)', lat: 40.80, lng: 29.43, maxHeight: 0, maxWeight: 44000, type: 'weight_station', description: '44 ton üstü araçlar cezai işlem görür' },
  { name: 'Hendek Kantar İstasyonu (O-4)', lat: 40.80, lng: 30.73, maxHeight: 0, maxWeight: 44000, type: 'weight_station', description: '44 ton üstü araçlar cezai işlem görür' },
  { name: 'Pozantı Kantar İstasyonu (O-21)', lat: 37.43, lng: 34.87, maxHeight: 0, maxWeight: 44000, type: 'weight_station', description: '44 ton üstü araçlar cezai işlem görür' },
  { name: 'Ulukışla Kantar İstasyonu (O-21)', lat: 37.55, lng: 34.48, maxHeight: 0, maxWeight: 44000, type: 'weight_station', description: '44 ton üstü araçlar cezai işlem görür' },
];

@Injectable()
export class RoutingService {
  private readonly logger = new Logger(RoutingService.name);

  async calculateTruckRoute(params: {
    origin: RoutePoint;
    destination: RoutePoint;
    waypoints: RoutePoint[];
    vehicleProfile: Partial<VehicleProfile>;
  }) {
    if (!params.origin || !params.destination) {
      throw new BadRequestException('Başlangıç ve varış noktaları zorunludur.');
    }

    const vp = params.vehicleProfile;
    const heightCm = vp.height || 400;
    const weightKg = vp.totalWeight || 25000;
    const axleKg = vp.axleWeight || 11500;

    // Calculate straight-line waypoints for restriction checking
    const coordinates = [
      params.origin,
      ...params.waypoints,
      params.destination,
    ];

    // Check route against known restrictions
    const warnings: Array<{ restriction: any; distance: number; clear: boolean }> = [];
    for (const restriction of KNOWN_RESTRICTIONS) {
      for (const point of coordinates) {
        const dist = this.haversineKm(point.lat, point.lng, restriction.lat, restriction.lng);
        if (dist < 30) { // within 30km of route
          const heightClear = restriction.maxHeight === 0 || heightCm <= restriction.maxHeight;
          const weightClear = restriction.maxWeight === 0 || weightKg <= restriction.maxWeight;
          warnings.push({ restriction, distance: dist, clear: heightClear && weightClear });
          break;
        }
      }
    }

    // Route summary
    const totalDistanceKm = this.calculatePathDistance(coordinates);
    const speedKmh = vp.adrClass ? 60 : 75; // ADR vehicles have lower speed limits
    const estimatedMinutes = Math.round((totalDistanceKm / speedKmh) * 60);

    const unsafeWarnings = warnings.filter((w) => !w.clear);

    return {
      route: {
        coordinates,
        totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
        estimatedMinutes,
        estimatedArrival: new Date(Date.now() + estimatedMinutes * 60000).toISOString(),
      },
      vehicleProfile: {
        height: heightCm,
        width: vp.width || 250,
        length: vp.length || 1650,
        totalWeight: weightKg,
        axleWeight: axleKg,
        adrClass: vp.adrClass || null,
      },
      safetyCheck: {
        totalRestrictionsNearby: warnings.length,
        unsafeCount: unsafeWarnings.length,
        isRouteSafe: unsafeWarnings.length === 0,
        warnings: warnings.filter((w) => !w.clear).map((w) => ({
          name: w.restriction.name,
          type: w.restriction.type,
          maxHeight: w.restriction.maxHeight,
          maxWeight: w.restriction.maxWeight,
          vehicleHeight: heightCm,
          vehicleWeight: weightKg,
          distanceKm: Math.round(w.distance * 10) / 10,
          description: w.restriction.description,
        })),
        allNearby: warnings.map((w) => ({
          name: w.restriction.name,
          type: w.restriction.type,
          clear: w.clear,
          distanceKm: Math.round(w.distance * 10) / 10,
        })),
      },
      truckSpeedLimitKmh: speedKmh,
    };
  }

  async getNearbyRestrictions(lat: number, lng: number, radiusKm = 50) {
    const restrictions = KNOWN_RESTRICTIONS
      .map((r) => ({
        ...r,
        distance: this.haversineKm(lat, lng, r.lat, r.lng),
      }))
      .filter((r) => r.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);

    return { restrictions, count: restrictions.length };
  }

  async checkBridgeClearance(vehicleHeightCm: number, coordinates: RoutePoint[]) {
    const warnings: any[] = [];
    for (const restriction of KNOWN_RESTRICTIONS) {
      for (const point of coordinates) {
        const dist = this.haversineKm(point.lat, point.lng, restriction.lat, restriction.lng);
        if (dist < 20 && vehicleHeightCm > restriction.maxHeight) {
          warnings.push({
            restriction: restriction.name,
            type: restriction.type,
            maxHeight: restriction.maxHeight,
            vehicleHeight: vehicleHeightCm,
            clearance: restriction.maxHeight - vehicleHeightCm,
            distanceKm: Math.round(dist * 10) / 10,
            danger: true,
          });
          break;
        }
      }
    }
    return { warnings, safe: warnings.length === 0 };
  }

  private haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private calculatePathDistance(points: RoutePoint[]): number {
    let dist = 0;
    for (let i = 1; i < points.length; i++) {
      dist += this.haversineKm(points[i - 1].lat, points[i - 1].lng, points[i].lat, points[i].lng);
    }
    return dist;
  }
}
