import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, Between } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FuelStation, WorkingStatus } from './fuel-station.entity';
import { FuelPrice, FuelType } from './fuel-price.entity';
import { StationService, StationServiceType, ServiceCategory } from './station-service.entity';
import { StationImage, ImageType } from './station-image.entity';
import { StationReview } from './station-review.entity';
import { Brand } from './brand.entity';
import { FavoriteStation } from './favorite-station.entity';
import { FuelAlert, AlertStatus, AlertType } from './fuel-alert.entity';
import { FuelPriceHistory } from './fuel-price-history.entity';
import { RouteStationMatch } from './route-station-match.entity';
import { StationAuditLog, StationAuditAction } from './station-audit-log.entity';
import { SavedStationFilter } from './saved-station-filter.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification.entity';
import { WebSocketGateway } from '../websocket/websocket.gateway';
import { calculateDistance } from '../common/distance';

const STALE_AFTER_HOURS = 24;
const FADED_AFTER_HOURS = 48;

// Service icon/color presets for UI rendering
const SERVICE_ICON_MAP: Record<string, { icon: string; color: string }> = {
  arac_yikama: { icon: 'car-wash', color: '#0284c7' },
  lokanta: { icon: 'utensils', color: '#ea580c' },
  kafe: { icon: 'coffee', color: '#92400e' },
  market: { icon: 'shopping-bag', color: '#16a34a' },
  motel: { icon: 'bed', color: '#6b21a8' },
  otopark: { icon: 'parking-circle', color: '#2563eb' },
  dus_wc: { icon: 'shower', color: '#0891b2' },
  elektrikli_sarj: { icon: 'plug-zap', color: '#059669' },
  servis_tamir: { icon: 'wrench', color: '#4b5563' },
  lastikci: { icon: 'circle-dot', color: '#1f2937' },
  banka_atm: { icon: 'landmark', color: '#ca8a04' },
  ucretsiz_wifi: { icon: 'wifi', color: '#0369a1' },
  cay_kahve: { icon: 'cup-soda', color: '#78350f' },
};

const CATEGORY_COLORS: Record<string, string> = {
  temel: '#6b7280',
  konfor: '#0891b2',
  arac: '#2563eb',
  premium: '#7c3aed',
};

// Retry wrapper for non-critical operations
async function withRetry<T>(fn: () => Promise<T>, retries: number = 2, delay: number = 300): Promise<T | null> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries) return null;
      await new Promise(r => setTimeout(r, delay * (i + 1)));
    }
  }
  return null;
}

@Injectable()
export class FuelStationsService {
  private readonly logger = new Logger(FuelStationsService.name);

  constructor(
    @InjectRepository(FuelStation) private stationRepo: Repository<FuelStation>,
    @InjectRepository(FuelPrice) private priceRepo: Repository<FuelPrice>,
    @InjectRepository(StationService) private serviceRepo: Repository<StationService>,
    @InjectRepository(StationImage) private imageRepo: Repository<StationImage>,
    @InjectRepository(StationReview) private reviewRepo: Repository<StationReview>,
    @InjectRepository(Brand) private brandRepo: Repository<Brand>,
    @InjectRepository(FavoriteStation) private favoriteRepo: Repository<FavoriteStation>,
    @InjectRepository(FuelAlert) private alertRepo: Repository<FuelAlert>,
    @InjectRepository(FuelPriceHistory) private historyRepo: Repository<FuelPriceHistory>,
    @InjectRepository(RouteStationMatch) private routeMatchRepo: Repository<RouteStationMatch>,
    @InjectRepository(StationAuditLog) private auditLogRepo: Repository<StationAuditLog>,
    @InjectRepository(SavedStationFilter) private savedFilterRepo: Repository<SavedStationFilter>,
    private notificationsService: NotificationsService,
    private wsGateway: WebSocketGateway,
    private eventEmitter: EventEmitter2,
  ) {}

  // ── Audit Logging ─────────────────────────────────────

  private async log(action: StationAuditAction, userId: string, metadata?: Record<string, any>) {
    await this.auditLogRepo.save(this.auditLogRepo.create({
      action, userId,
      stationId: metadata?.stationId as string,
      metadata,
    })).catch(() => {});
  }

  // ── Station CRUD ────────────────────────────────────────

  async create(data: any, userId: string) {
    const { prices, services, ...stationData } = data;

    // Set default coordinates if not provided
    let lat = stationData.latitude ?? 40.7854;
    let lng = stationData.longitude ?? 31.3021;
    // latitude and longitude are stored directly
    if (!stationData.city) stationData.city = 'Düzce';
    if (!stationData.district) stationData.district = 'Kaynaşlı';

    const station = this.stationRepo.create({ ...stationData, createdById: userId } as any) as unknown as FuelStation;
    const saved = await this.stationRepo.save(station) as unknown as FuelStation;

    // Save prices if provided
    if (prices && Array.isArray(prices)) {
      for (const p of prices) {
        if (p.price !== undefined && p.price !== null) {
          await this.priceRepo.save({
            stationId: saved.id,
            fuelType: p.fuelType,
            price: parseFloat(p.price) || 0,
            isConfirmed: true,
            source: 'manual',
            confidenceScore: 1.0,
            updatedById: userId
          });
        }
      }
    }

    // Save services if provided
    if (services && Array.isArray(services)) {
      for (const svc of services) {
        const serviceType = typeof svc === 'string' ? svc : svc.serviceType;
        if (serviceType) {
          await this.serviceRepo.save({
            stationId: saved.id,
            serviceType: serviceType as StationServiceType,
            category: ServiceCategory.TEMEL,
            description: `${saved.name} bünyesinde sunulan ${serviceType} hizmeti.`
          });
        }
      }
    }

    await this.log(StationAuditAction.STATION_CREATED, userId, { stationId: saved.id });
    return this.findById(saved.id);
  }

  async findById(id: string) {
    const station = await this.stationRepo.findOne({
      where: { id, isDeleted: false },
      relations: ['prices', 'services', 'images', 'reviews'],
    });
    if (!station) throw new NotFoundException('İstasyon bulunamadı');
    return station;
  }

  async findAll(filters: {
    city?: string;
    district?: string;
    brand?: string;
    serviceTypes?: StationServiceType[];
    is247?: boolean;
    hasCharging?: boolean;
    minRating?: number;
    minPrice?: number;
    maxPrice?: number;
    fuelType?: FuelType;
    page?: number;
    limit?: number;
    sortBy?: 'name' | 'rating' | 'createdAt';
    sortOrder?: 'ASC' | 'DESC';
    search?: string;
  }) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const qb = this.stationRepo.createQueryBuilder('s')
      .where('s.isDeleted = false')
      .leftJoinAndSelect('s.prices', 'prices')
      .leftJoinAndSelect('s.services', 'services')
      .leftJoinAndSelect('s.images', 'images');

    if (filters.search) {
      qb.andWhere(
        '(s.name ILIKE :search OR s.fullAddress ILIKE :search OR EXISTS (SELECT 1 FROM station_services ss WHERE ss.stationId = s.id AND ss.serviceType ILIKE :search))',
        { search: `%${filters.search}%` }
      );
    }

    if (filters.city) qb.andWhere('s.city ILIKE :city', { city: `%${filters.city}%` });
    if (filters.district) qb.andWhere('s.district ILIKE :district', { district: `%${filters.district}%` });
    if (filters.brand) qb.andWhere('s.brand = :brand', { brand: filters.brand });
    if (filters.is247) qb.andWhere('s.is247 = :is247', { is247: true });
    if (filters.hasCharging) {
      qb.andWhere('EXISTS (SELECT 1 FROM station_services ss WHERE ss.stationId = s.id AND ss.serviceType = :chargingType)',
        { chargingType: StationServiceType.ELEKTRIKLI_SARJ });
    }
    if (filters.minRating) {
      qb.andWhere('s.averageRating >= :minRating', { minRating: filters.minRating });
    }
    if (filters.serviceTypes?.length) {
      qb.andWhere('EXISTS (SELECT 1 FROM station_services ss WHERE ss.stationId = s.id AND ss.serviceType IN (:...serviceTypes))',
        { serviceTypes: filters.serviceTypes });
    }
    if (filters.fuelType) {
      qb.andWhere('EXISTS (SELECT 1 FROM fuel_prices fp WHERE fp.stationId = s.id AND fp.fuelType = :fuelType)',
        { fuelType: filters.fuelType });
    }
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      const priceConditions: string[] = [];
      if (filters.minPrice !== undefined) priceConditions.push('fp.price >= :minPrice');
      if (filters.maxPrice !== undefined) priceConditions.push('fp.price <= :maxPrice');
      qb.andWhere(`EXISTS (SELECT 1 FROM fuel_prices fp WHERE fp.stationId = s.id ${priceConditions.length ? 'AND ' + priceConditions.join(' AND ') : ''})`,
        { minPrice: filters.minPrice, maxPrice: filters.maxPrice });
    }

    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'DESC';

    let stations: FuelStation[];
    let total: number;

    if (sortBy === 'rating') {
      qb.orderBy('s.averageRating', sortOrder);
      [stations, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    } else {
      qb.orderBy(`s.${sortBy}`, sortOrder);
      [stations, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    }

    return { stations, total, page, totalPages: Math.ceil(total / limit) };
  }

  async update(id: string, data: any, userId: string) {
    const station = await this.findById(id);
    if (station.createdById !== userId) {
      throw new ForbiddenException('Bu istasyonu düzenleme yetkiniz yok');
    }

    const { prices, services, ...stationData } = data;

    await this.stationRepo.update(id, stationData);

    // Update prices if provided (clear and insert)
    if (prices && Array.isArray(prices)) {
      await this.priceRepo.delete({ stationId: id });
      for (const p of prices) {
        if (p.price !== undefined && p.price !== null) {
          await this.priceRepo.save({
            stationId: id,
            fuelType: p.fuelType,
            price: parseFloat(p.price) || 0,
            isConfirmed: true,
            source: 'manual',
            confidenceScore: 1.0,
            updatedById: userId
          });
        }
      }
    }

    // Update services if provided (clear and insert)
    if (services && Array.isArray(services)) {
      await this.serviceRepo.delete({ stationId: id });
      for (const svc of services) {
        const serviceType = typeof svc === 'string' ? svc : svc.serviceType;
        if (serviceType) {
          await this.serviceRepo.save({
            stationId: id,
            serviceType: serviceType as StationServiceType,
            category: ServiceCategory.TEMEL,
            description: `${station.name} bünyesinde sunulan ${serviceType} hizmeti.`
          });
        }
      }
    }

    await this.log(StationAuditAction.STATION_UPDATED, userId, { stationId: id });
    return this.findById(id);
  }

  async delete(id: string, userId: string) {
    const station = await this.findById(id);
    if (station.createdById !== userId) {
      throw new ForbiddenException('Bu istasyonu silme yetkiniz yok');
    }
    await this.stationRepo.update(id, { isDeleted: true } as any);
    await this.log(StationAuditAction.STATION_DELETED, userId, { stationId: id });
    return { deleted: true };
  }

  // ── Open Check (with night shift support) ──────────────

  isStationOpen(station: FuelStation): boolean {
    if (station.workingStatus !== WorkingStatus.ACTIVE) return false;
    if (station.is247) return true;
    if (station.nightShift) return true; // night shift stations are always open for truckers
    if (!station.workingHours?.length) return true; // unknown = assume open

    const now = new Date();
    const days = ['pazar', 'pazartesi', 'sali', 'carsamba', 'persembe', 'cuma', 'cumartesi'];
    const todayName = days[now.getDay()];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const today = station.workingHours.find(w => w.day?.toLowerCase() === todayName);
    if (!today) return false;

    const [openH, openM] = today.open.split(':').map(Number);
    const [closeH, closeM] = today.close.split(':').map(Number);
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    if (closeMinutes < openMinutes) { return currentMinutes >= openMinutes || currentMinutes <= closeMinutes; }
    return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
  }

  // ── Service Icon/Color Enrichment ──────────────────────

  enrichService(service: StationServiceType): { icon: string; color: string; label: string } {
    const preset = SERVICE_ICON_MAP[service] || { icon: 'circle', color: '#6b7280' };
    const labels: Record<string, string> = {
      arac_yikama: 'Araç Yıkama', lokanta: 'Lokanta', kafe: 'Kafe',
      market: 'Market', motel: 'Motel', otopark: 'Otopark',
      dus_wc: 'Duş & WC', elektrikli_sarj: 'Elektrikli Şarj',
      servis_tamir: 'Servis & Tamir', lastikci: 'Lastikçi',
      banka_atm: 'Banka/ATM', ucretsiz_wifi: 'Ücretsiz WiFi',
      cay_kahve: 'Çay & Kahve',
    };
    return { ...preset, label: labels[service] || service };
  }

  // ── PostGIS Query Path ─────────────────────────────────

  private _postGisAvailable: boolean | null = null;

  private async isPostGISAvailable(): Promise<boolean> {
    if (this._postGisAvailable !== null) return this._postGisAvailable;

    // Check environment override first
    if (process.env.USE_POSTGIS === 'true') {
      this._postGisAvailable = true;
      return true;
    }
    if (process.env.USE_POSTGIS === 'false') {
      this._postGisAvailable = false;
      return false;
    }

    // Auto-detect: try a simple spatial query
    try {
      await this.stationRepo.query(`SELECT 1 FROM pg_extension WHERE extname = 'postgis'`);
      this._postGisAvailable = true;
      this.logger.log('PostGIS extension detected — spatial queries enabled');
    } catch {
      this._postGisAvailable = false;
      this.logger.warn('PostGIS not available — falling back to in-memory Haversine calculations');
    }
    return this._postGisAvailable;
  }

  /** Build PostGIS spatial query — used in production with PostgreSQL */
  private buildPostGISNearbyQuery(lat: number, lng: number, radiusMeters: number): string {
    return `
      SELECT id, ST_Distance(
        location,
        ST_MakePoint(${lng}, ${lat})::geography
      ) AS distance
      FROM fuel_stations
      WHERE ST_DWithin(
        location,
        ST_MakePoint(${lng}, ${lat})::geography,
        ${radiusMeters}
      )
      ORDER BY distance ASC
    `;
  }

  // ── Brand Management ─────────────────────────────────────

  async getBrands() {
    return this.brandRepo.find({ order: { sortOrder: 'ASC', name: 'ASC' } });
  }

  async createBrand(data: { name: string; logoUrl?: string; color?: string }) {
    const existing = await this.brandRepo.findOne({ where: { name: data.name } });
    if (existing) return existing;
    return this.brandRepo.save(this.brandRepo.create(data));
  }

  // ── Station Services Management ──────────────────────────

  async addStationService(stationId: string, serviceType: StationServiceType) {
    await this.findById(stationId);
    const existing = await this.serviceRepo.findOne({ where: { stationId, serviceType } });
    if (existing) return existing;
    const preset = SERVICE_ICON_MAP[serviceType];
    const svc = this.serviceRepo.create({
      stationId, serviceType,
      iconUrl: preset?.icon ? `/icons/services/${preset.icon}.svg` : undefined,
      categoryColor: preset?.color || CATEGORY_COLORS[ServiceCategory.TEMEL],
    });
    return this.serviceRepo.save(svc);
  }

  async removeStationService(stationId: string, serviceType: StationServiceType) {
    await this.serviceRepo.delete({ stationId, serviceType });
    return { removed: true };
  }

  async getStationServices(stationId: string) {
    const services = await this.serviceRepo.find({ where: { stationId } });
    return services.map(s => ({
      ...s,
      icon: this.enrichService(s.serviceType),
    }));
  }

  // ── Nearby Search ──────────────────────────────────────

  async findNearby(lat: number, lng: number, radiusKm: number = 10, fuelType?: FuelType) {
    if (await this.isPostGISAvailable()) {
      return this._findNearbyPostGIS(lat, lng, radiusKm, fuelType);
    }
    return this._findNearbyHaversine(lat, lng, radiusKm, fuelType);
  }

  private async _findNearbyPostGIS(lat: number, lng: number, radiusKm: number, fuelType?: FuelType) {
    const radiusMeters = radiusKm * 1000;
    const stations = await this.stationRepo.find({
      where: { isDeleted: false, workingStatus: WorkingStatus.ACTIVE },
      relations: ['prices', 'services', 'images'],
    });
    return stations.map((s) => {
      const sLat = s.latitude || 0;
      const sLng = s.longitude || 0;
      const rawDist = calculateDistance(lat, lng, sLat, sLng) * 1000;
      const price = fuelType
        ? s.prices?.find((p) => p.fuelType === fuelType)
        : s.prices?.[0];
      return {
        station: s,
        distanceKm: Math.round(rawDist / 1000 * 10) / 10,
        price,
        freshness: this.getPriceFreshness(price?.updatedAt),
        isOpen: this.isStationOpen(s),
        hasMandatoryFuel: !!s.prices?.find((p) => p.fuelType === FuelType.MOTORIN),
      };
    });
  }

  private async _findNearbyHaversine(lat: number, lng: number, radiusKm: number, fuelType?: FuelType) {
    const stations = await this.stationRepo.find({
      where: { isDeleted: false, workingStatus: WorkingStatus.ACTIVE },
      relations: ['prices', 'services', 'images'],
    });

    const results = stations
      .map((s) => {
        const sLat = s.latitude || 0;
        const sLng = s.longitude || 0;
        const dist = calculateDistance(lat, lng, sLat, sLng);
        const price = fuelType
          ? s.prices?.find((p) => p.fuelType === fuelType)
          : s.prices?.[0];
        const freshness = this.getPriceFreshness(price?.updatedAt);
        return {
          station: s,
          distanceKm: Math.round(dist * 10) / 10,
          price,
          freshness,
          isOpen: this.isStationOpen(s),
          hasMandatoryFuel: !!s.prices?.find((p) => p.fuelType === FuelType.MOTORIN),
        };
      })
      .filter((r) => r.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return results;
  }

  // ── Route-based Search ─────────────────────────────────

  async findAlongRoute(
    waypoints: { lat: number; lng: number }[],
    radiusKm: number = 5,
    fuelType?: FuelType,
  ) {
    const isPostGIS = await this.isPostGISAvailable();
    const routeHash = waypoints.map(w => `${w.lat.toFixed(4)},${w.lng.toFixed(4)}`).join('|');

    const matched: any[] = [];

    if (isPostGIS) {
      // PostGIS path: for each waypoint, find stations within radius
      const radiusMeters = radiusKm * 1000;
      const seen = new Set<string>();

      for (const wp of waypoints) {
        const qb = this.stationRepo.createQueryBuilder('s')
          .where('s.isDeleted = false')
          .andWhere('s.workingStatus = :ws', { ws: WorkingStatus.ACTIVE })
          .andWhere(`ST_DWithin(ST_MakePoint(s.longitude, s.latitude)::geography, ST_MakePoint(:lng, :lat)::geography, :radius)`)
          .leftJoinAndSelect('s.prices', 'prices')
          .leftJoinAndSelect('s.services', 'services')
          .setParameters({ lng: wp.lng, lat: wp.lat, radius: radiusMeters })
          .addSelect(`ST_Distance(ST_MakePoint(s.longitude, s.latitude)::geography, ST_MakePoint(:lng, :lat)::geography)`, 'distance');

        const nearby = await qb.getMany();
        for (const station of nearby) {
          if (seen.has(station.id)) continue;
          seen.add(station.id);

          const rawDist = (station as any).distance || calculateDistance(wp.lat, wp.lng, station.latitude, station.longitude);
          const price = fuelType
            ? station.prices?.find((p) => p.fuelType === fuelType)
            : station.prices?.[0];
          const distanceFromStart = calculateDistance(waypoints[0].lat, waypoints[0].lng, station.latitude, station.longitude);

          matched.push({
            station,
            deviationKm: Math.round(rawDist / 1000 * 10) / 10,
            distanceFromStartKm: Math.round(distanceFromStart * 10) / 10,
            price,
            freshness: this.getPriceFreshness(price?.updatedAt),
            isOpen: this.isStationOpen(station),
          });
        }
      }
    } else {
      // Fallback: in-memory Haversine
      const stations = await this.stationRepo.find({
        where: { isDeleted: false, workingStatus: WorkingStatus.ACTIVE },
        relations: ['prices', 'services'],
      });

      for (const station of stations) {
        let minDeviation = Infinity;
        let closestWpIndex = 0;
        for (let i = 0; i < waypoints.length; i++) {
          const dist = calculateDistance(waypoints[i].lat, waypoints[i].lng, station.latitude, station.longitude);
          if (dist < minDeviation) {
            minDeviation = dist;
            closestWpIndex = i;
          }
        }
        if (minDeviation <= radiusKm) {
          const price = fuelType
            ? station.prices?.find((p) => p.fuelType === fuelType)
            : station.prices?.[0];
          const freshness = this.getPriceFreshness(price?.updatedAt);
          const distanceFromStart = closestWpIndex === 0 ? 0 : Math.round(calculateDistance(
            waypoints[0].lat, waypoints[0].lng, station.latitude, station.longitude
          ) * 10) / 10;
          matched.push({
            station,
            deviationKm: Math.round(minDeviation * 10) / 10,
            distanceFromStartKm: distanceFromStart,
            price,
            freshness,
            isOpen: this.isStationOpen(station),
          });
        }
      }
    }

    matched.sort((a, b) => a.deviationKm - b.deviationKm);

    // Cache top 10 matches
    const topMatches = matched.slice(0, 10);
    for (const m of topMatches) {
      await this.routeMatchRepo.save(this.routeMatchRepo.create({
        stationId: m.station.id,
        routeHash,
        deviationKm: m.deviationKm,
        distanceFromStartKm: m.distanceFromStartKm || 0,
        suggestedFuelType: fuelType,
        isRecommended: m.deviationKm <= 2,
      })).catch(() => {});
    }

    return matched;
  }

  // ── Smart Route Recommendations ────────────────────────

  async getRouteRecommendations(
    waypoints: { lat: number; lng: number }[],
    fuelType: FuelType = FuelType.MOTORIN,
  ) {
    const stations = await this.stationRepo.find({
      where: { isDeleted: false, workingStatus: WorkingStatus.ACTIVE },
      relations: ['prices', 'services'],
    });

    type Scored = {
      station: FuelStation;
      deviationKm: number;
      price: number;
      score: number;
      reason: string;
      hasRest: boolean;
      hasFood: boolean;
      hasParking: boolean;
    };
    const scored: Scored[] = [];

    for (const station of stations) {
      let minDeviation = Infinity;
      for (const wp of waypoints) {
        const dist = calculateDistance(wp.lat, wp.lng, station.latitude, station.longitude);
        if (dist < minDeviation) minDeviation = dist;
      }
      if (minDeviation > 10) continue; // 10km max for recommendations

      const motorinPrice = station.prices?.find(p => p.fuelType === fuelType);
      if (!motorinPrice) continue;

      const price = Number(motorinPrice.price);
      const serviceTypes = station.services?.map(s => s.serviceType) || [];
      const hasFood = serviceTypes.includes(StationServiceType.LOKANTA) || serviceTypes.includes(StationServiceType.KAFE);
      const hasRest = serviceTypes.includes(StationServiceType.DUS_WC) || serviceTypes.includes(StationServiceType.MOTEL);
      const hasParking = serviceTypes.includes(StationServiceType.OTOPARK);
      const isPremium = station.averageRating >= 4;

      // Score: lower deviation + lower price + services bonus
      let score = 100 - minDeviation * 5;
      score += Math.max(0, 50 - price); // cheaper = better
      if (hasFood) score += 15;
      if (hasRest) score += 15;
      if (hasParking) score += 10;
      if (station.is247) score += 10;
      if (isPremium) score += 5;

      let reason = '';
      if (minDeviation <= 1) reason = 'Rota üzerinde, ideal mola noktası';
      else if (price <= 40) reason = 'En uygun fiyatlı istasyon';
      else if (hasFood && hasRest) reason = 'Dinlenme ve yemek molası için uygun';
      else if (hasFood) reason = 'Yemek molası için uygun';
      else if (isPremium) reason = 'Yüksek puanlı premium istasyon';
      else reason = 'Rota üzerinde uygun istasyon';

      scored.push({ station, deviationKm: minDeviation, price, score, reason, hasRest, hasFood, hasParking });
    }

    scored.sort((a, b) => b.score - a.score);

    return {
      cheapest: scored.filter(s => s.deviationKm <= 3).sort((a, b) => a.price - b.price).slice(0, 3),
      bestStops: scored.filter(s => s.hasFood || s.hasRest).sort((a, b) => b.score - a.score).slice(0, 5),
      premium: scored.filter(s => s.station.averageRating >= 4).sort((a, b) => b.station.averageRating - a.station.averageRating).slice(0, 3),
      all: scored.slice(0, 20),
    };
  }

  // ── Price Freshness ─────────────────────────────────────

  getPriceFreshness(updatedAt?: Date): { label: string; isStale: boolean; isFaded: boolean; hoursSinceUpdate: number } {
    if (!updatedAt) {
      return { label: 'Fiyat Bilinmiyor', isStale: true, isFaded: true, hoursSinceUpdate: Infinity };
    }
    const hours = (Date.now() - updatedAt.getTime()) / 3600000;
    if (hours >= FADED_AFTER_HOURS) {
      return { label: 'Güncel Değil', isStale: true, isFaded: true, hoursSinceUpdate: Math.round(hours) };
    }
    if (hours >= STALE_AFTER_HOURS) {
      return { label: 'Güncel Değil', isStale: true, isFaded: false, hoursSinceUpdate: Math.round(hours) };
    }
    return { label: 'Güncel', isStale: false, isFaded: false, hoursSinceUpdate: Math.round(hours) };
  }

  async getStalePrices(stationId?: string) {
    const since = new Date(Date.now() - STALE_AFTER_HOURS * 3600000);
    const where: any = { updatedAt: LessThanOrEqual(since) };
    if (stationId) where.stationId = stationId;
    return this.priceRepo.find({ where, relations: ['station'] });
  }

  // ── EX-010: Bulk Import ──────────────────────────────

  async bulkImportPrices(
    stationId: string,
    prices: Array<{ fuelType: string; price: number }>,
    userId: string,
  ) {
    const station = await this.stationRepo.findOne({ where: { id: stationId } });
    if (!station) throw new NotFoundException('İstasyon bulunamadı');

    const results: Array<{ fuelType: string; price: number; status: string }> = [];
    const errors: Array<{ fuelType: string; error: string }> = [];

    for (const item of prices) {
      try {
        if (!Object.values(FuelType).includes(item.fuelType as FuelType)) {
          errors.push({ fuelType: item.fuelType, error: 'Geçersiz yakıt tipi' });
          continue;
        }
        if (item.price <= 0 || item.price > 500) {
          errors.push({ fuelType: item.fuelType, error: 'Fiyat 0-500 aralığında olmalı' });
          continue;
        }

        const priceRecord = await this.updatePrice(
          stationId,
          item.fuelType as FuelType,
          item.price,
          userId,
          'bulk_import',
        );
        results.push({ fuelType: item.fuelType, price: item.price, status: 'updated' });

        // Record in price history
        await this.historyRepo.save(this.historyRepo.create({
          stationId,
          fuelType: item.fuelType,
          price: item.price,
          updatedById: userId,
          period: new Date().toISOString().slice(0, 7),
        }));
      } catch (err: any) {
        errors.push({ fuelType: item.fuelType, error: err.message });
      }
    }

    await this.log(StationAuditAction.PRICE_UPDATED, userId, {
      stationId,
      action: 'bulk_import',
      imported: results.map(r => `${r.fuelType}=${r.price}`).join(', '),
    });

    return {
      imported: results.length,
      total: prices.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /** EX-010: Get EPDK reference prices for comparison */
  async getEpdkReferencePrices() {
    // Try to get from EPDK scraper's LIVE_FUEL_PRICES
    let epdkPrices: any = null;
    try {
      const { LIVE_FUEL_PRICES } = require('../loads/epdk-scraper.service');
      epdkPrices = { ...LIVE_FUEL_PRICES };
    } catch {
      epdkPrices = { motorin: 45.50, benzin: 43.20, lpg: 23.80, adblue: 28.00, updatedAt: new Date().toISOString() };
    }

    const now = new Date();
    const daysThreshold = new Date(now);
    daysThreshold.setDate(daysThreshold.getDate() - 1); // 24h

    // Get stale station prices (not updated in 24h)
    const stalePrices = await this.priceRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.station', 'station')
      .where('p.updatedAt < :threshold', { threshold: daysThreshold })
      .orderBy('p.updatedAt', 'ASC')
      .limit(50)
      .getMany();

    return {
      epdk: epdkPrices,
      staleStationCount: stalePrices.length,
      staleSample: stalePrices.slice(0, 10).map(p => ({
        stationId: p.stationId,
        stationName: (p as any).station?.name,
        fuelType: p.fuelType,
        price: Number(p.price),
        lastUpdated: p.updatedAt,
        hoursSinceUpdate: Math.round((now.getTime() - p.updatedAt.getTime()) / (1000 * 60 * 60)),
      })),
    };
  }

  // ── Polling Fallback ──────────────────────────────────

  async getUpdatedSince(since: Date, city?: string, fuelType?: FuelType) {
    const qb = this.priceRepo.createQueryBuilder('p')
      .leftJoinAndSelect('p.station', 'station')
      .where('p.updatedAt >= :since', { since })
      .andWhere('station.isDeleted = false');

    if (city) qb.andWhere('station.city ILIKE :city', { city: `%${city}%` });
    if (fuelType) qb.andWhere('p.fuelType = :fuelType', { fuelType });

    const updates = await qb.orderBy('p.updatedAt', 'DESC').limit(50).getMany();

    return updates.map(p => ({
      stationId: p.stationId,
      stationName: p.station.name,
      brand: p.station.brand,
      fuelType: p.fuelType,
      price: Number(p.price),
      confidenceScore: p.confidenceScore,
      updatedAt: p.updatedAt,
      isOpen: this.isStationOpen(p.station),
    }));
  }

  // ── Price Anomaly Detection ────────────────────────────

  async detectPriceAnomaly(fuelType: FuelType, price: number): Promise<{ isAnomaly: boolean; reason?: string; avgPrice?: number }> {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000);
    const recentPrices = await this.priceRepo.find({
      where: { fuelType, updatedAt: MoreThanOrEqual(twoDaysAgo) },
    });

    if (recentPrices.length < 5) return { isAnomaly: false };

    const prices = recentPrices.map(p => Number(p.price));
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const std = Math.sqrt(prices.reduce((sq, p) => sq + (p - avg) ** 2, 0) / prices.length);

    if (Math.abs(price - avg) > 2 * std) {
      return {
        isAnomaly: true,
        reason: `Fiyat ortalamadan (${avg.toFixed(2)} ₺) anormal sapma gösteriyor`,
        avgPrice: Math.round(avg * 100) / 100,
      };
    }
    if (price > avg * 1.5 || price < avg * 0.5) {
      return {
        isAnomaly: true,
        reason: `Fiyat (${price} ₺) piyasa ortalamasının (${avg.toFixed(2)} ₺) çok dışında`,
        avgPrice: Math.round(avg * 100) / 100,
      };
    }
    return { isAnomaly: false };
  }

  // ── Price Management ───────────────────────────────────

  private calculateConfidenceScore(source: string, isConfirmed: boolean, anomaly: boolean): number {
    if (isConfirmed) return 1.0;
    if (source === 'admin_confirmed') return 0.95;
    if (source === 'community' && !anomaly) return 0.7;
    if (source === 'community' && anomaly) return 0.3;
    if (source === 'flagged') return 0.2;
    return 0.8; // manual, no anomaly
  }

  async updatePrice(stationId: string, fuelType: FuelType, price: number, userId: string, source: string = 'manual') {
    const station = await this.findById(stationId);
    const anomaly = await this.detectPriceAnomaly(fuelType, price);

    const oldPrice = await this.priceRepo.findOne({ where: { stationId, fuelType } });
    const oldPriceValue = oldPrice ? Number(oldPrice.price) : 0;

    let fuelPrice = oldPrice;
    if (fuelPrice) {
      fuelPrice.price = price;
      fuelPrice.updatedById = userId;
      fuelPrice.updatedAt = new Date();
      fuelPrice.isConfirmed = source === 'admin_confirmed' || (!anomaly.isAnomaly && source !== 'community');
      fuelPrice.source = anomaly.isAnomaly ? 'flagged' : source;
      fuelPrice.confidenceScore = this.calculateConfidenceScore(fuelPrice.source, fuelPrice.isConfirmed, anomaly.isAnomaly);
    } else {
      const isConfirmed = source === 'admin_confirmed' || (!anomaly.isAnomaly && source !== 'community');
      const src = anomaly.isAnomaly ? 'flagged' : source;
      fuelPrice = this.priceRepo.create({
        stationId, fuelType, price, updatedById: userId,
        isConfirmed,
        source: src,
        confidenceScore: this.calculateConfidenceScore(src, isConfirmed, anomaly.isAnomaly),
      });
    }
    const saved = await this.priceRepo.save(fuelPrice);

    // Record history with partition key
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    await this.historyRepo.save(this.historyRepo.create({
      stationId, fuelType, price, updatedById: userId, period,
    }));

    // Check alerts
    await this.checkPriceAlerts(fuelType, price, oldPrice ? Number(oldPrice.price) : price, station);

    // Audit log
    await this.log(
      anomaly.isAnomaly ? StationAuditAction.PRICE_FLAGGED : StationAuditAction.PRICE_UPDATED,
      userId,
      { stationId, fuelType, price, oldPrice: oldPriceValue, anomaly: anomaly.isAnomaly },
    );

    // Emit event
    this.eventEmitter.emit('fuel.price.updated', {
      stationId, fuelType, price, oldPrice: oldPriceValue,
      isAnomaly: anomaly.isAnomaly, timestamp: new Date(),
    });

    // WebSocket live update to subscribers
    this.wsGateway.sendToRoom(`station:${stationId}`, 'fuel_price_updated', {
      stationId, fuelType, price, oldPrice: oldPriceValue,
      confidenceScore: saved.confidenceScore,
      source: saved.source,
      isConfirmed: saved.isConfirmed,
      timestamp: new Date().toISOString(),
    });

    return { price: saved, anomaly };
  }

  // ── Community Price Reporting ──────────────────────────

  async reportPrice(stationId: string, fuelType: FuelType, price: number, userId: string) {
    const existing = await this.priceRepo.findOne({ where: { stationId, fuelType } });
    if (existing) {
      const currentPrice = Number(existing.price);
      const diff = Math.abs(price - currentPrice);
      // If price is close to current, just increase confidence
      if (diff < 0.5) {
        existing.confidenceScore = Math.min(1, existing.confidenceScore + 0.1);
        await this.priceRepo.save(existing);
        await this.log(StationAuditAction.PRICE_REPORTED, userId, { stationId, fuelType, price, action: 'confirmed' });
        return { price: existing, action: 'confirmed' };
      }
    }
    // Submit as community-sourced price update
    const result = await this.updatePrice(stationId, fuelType, price, userId, 'community');
    await this.log(StationAuditAction.PRICE_REPORTED, userId, { stationId, fuelType, price, action: 'submitted' });
    return { ...result, action: 'submitted' };
  }

  async getPriceHistory(stationId: string, fuelType: FuelType, days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const history = await this.historyRepo.find({
      where: { stationId, fuelType, createdAt: MoreThanOrEqual(since) },
      order: { createdAt: 'ASC' },
    });

    let trend = 0;
    let trendPercent = 0;
    if (history.length >= 2) {
      const first = Number(history[0].price);
      const last = Number(history[history.length - 1].price);
      trend = last - first;
      trendPercent = first > 0 ? Math.round((trend / first) * 10000) / 100 : 0;
    }

    return { history, trend: Math.round(trend * 100) / 100, trendPercent };
  }

  // ── Price Comparison ───────────────────────────────────

  async comparePrices(filters: {
    fuelType?: FuelType;
    city?: string;
    brand?: string;
    lat?: number;
    lng?: number;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    isOpen?: boolean;
    sortBy: 'price' | 'distance' | 'rating' | 'freshness' | 'premium';
    sortOrder?: 'ASC' | 'DESC';
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const fuelType = filters.fuelType || FuelType.MOTORIN;

    const qb = this.priceRepo.createQueryBuilder('p')
      .leftJoinAndSelect('p.station', 'station')
      .leftJoinAndSelect('station.services', 'services')
      .where('station.isDeleted = false');

    if (filters.city) qb.andWhere('station.city ILIKE :city', { city: `%${filters.city}%` });
    if (filters.brand) qb.andWhere('station.brand = :brand', { brand: filters.brand });
    if (filters.minRating) qb.andWhere('station.averageRating >= :minRating', { minRating: filters.minRating });
    qb.andWhere('p.fuelType = :fuelType', { fuelType });

    let results = await qb.getMany();

    let mapped = results.map((p) => {
      const freshness = this.getPriceFreshness(p.updatedAt);
      let distance = 0;
      if (filters.lat && filters.lng) {
        distance = calculateDistance(filters.lat, filters.lng, p.station.latitude, p.station.longitude);
      }
      return {
        stationId: p.stationId,
        stationName: p.station.name,
        brand: p.station.brand,
        brandLogo: p.station.brandLogo,
        city: p.station.city,
        district: p.station.district,
        latitude: p.station.latitude,
        longitude: p.station.longitude,
        price: Number(p.price),
        distanceKm: Math.round(distance * 10) / 10,
        rating: p.station.averageRating,
        services: p.station.services?.map(s => s.serviceType) || [],
        isOpen: this.isStationOpen(p.station),
        is247: p.station.is247,
        freshness,
        confidenceScore: p.confidenceScore,
        source: p.source,
      };
    });

    // Apply filters
    if (filters.minPrice !== undefined) {
      mapped = mapped.filter(m => m.price >= filters.minPrice!);
    }
    if (filters.maxPrice !== undefined) {
      mapped = mapped.filter(m => m.price <= filters.maxPrice!);
    }
    if (filters.isOpen) {
      mapped = mapped.filter(m => m.isOpen);
    }

    // Sort
    const order = filters.sortOrder || 'ASC';
    if (filters.sortBy === 'price') {
      mapped.sort((a, b) => order === 'ASC' ? a.price - b.price : b.price - a.price);
    } else if (filters.sortBy === 'distance') {
      mapped.sort((a, b) => order === 'ASC' ? a.distanceKm - b.distanceKm : b.distanceKm - a.distanceKm);
    } else if (filters.sortBy === 'rating') {
      mapped.sort((a, b) => order === 'DESC' ? b.rating - a.rating : a.rating - b.rating);
    } else if (filters.sortBy === 'freshness') {
      mapped.sort((a, b) => order === 'ASC'
        ? a.freshness.hoursSinceUpdate - b.freshness.hoursSinceUpdate
        : b.freshness.hoursSinceUpdate - a.freshness.hoursSinceUpdate);
    } else if (filters.sortBy === 'premium') {
      mapped.sort((a, b) => {
        const aScore = (a.is247 ? 10 : 0) + (a.rating >= 4 ? 15 : 0) + (a.confidenceScore >= 0.8 ? 10 : 0);
        const bScore = (b.is247 ? 10 : 0) + (b.rating >= 4 ? 15 : 0) + (b.confidenceScore >= 0.8 ? 10 : 0);
        return order === 'DESC' ? bScore - aScore : aScore - bScore;
      });
    }

    const total = mapped.length;
    const paginated = mapped.slice((page - 1) * limit, page * limit);

    // Savings calc + trend
    const cheapestPrice = mapped.length > 0 ? mapped[0].price : 0;
    for (const item of paginated) {
      (item as any).savingsPerLiter = cheapestPrice > 0
        ? Math.round((item.price - cheapestPrice) * 100) / 100
        : 0;
    }

    return {
      comparisons: paginated,
      total, page,
      totalPages: Math.ceil(total / limit),
      fuelType,
      cheapestPrice,
    };
  }

  // ── Price Confirmation (Admin) ──────────────────────────

  async confirmPrice(priceId: string, userId: string) {
    const price = await this.priceRepo.findOne({ where: { id: priceId } });
    if (!price) throw new NotFoundException('Fiyat bulunamadı');
    price.isConfirmed = true;
    price.source = 'admin_confirmed';
    price.confidenceScore = 1.0;
    const saved = await this.priceRepo.save(price);
    await this.log(StationAuditAction.PRICE_CONFIRMED, userId, { priceId, stationId: price.stationId, fuelType: price.fuelType });
    return saved;
  }

  async getFlaggedPrices() {
    return this.priceRepo.find({
      where: { source: 'flagged', isConfirmed: false },
      relations: ['station'],
      order: { updatedAt: 'DESC' },
    });
  }

  // ── Reviews ─────────────────────────────────────────────

  async addReview(stationId: string, userId: string, rating: number, comment: string) {
    await this.findById(stationId);

    const review = this.reviewRepo.create({ stationId, userId, rating, comment });
    const saved = await this.reviewRepo.save(review);

    const stats = await this.reviewRepo
      .createQueryBuilder('r')
      .select('AVG(r.rating)', 'avg')
      .addSelect('COUNT(r.id)', 'count')
      .where('r.stationId = :stationId', { stationId })
      .andWhere('r.isDeleted = false')
      .getRawOne();

    await this.stationRepo.update(stationId, {
      averageRating: parseFloat(Number(stats.avg).toFixed(1)),
      reviewCount: parseInt(stats.count, 10),
    });

    await this.log(StationAuditAction.REVIEW_ADDED, userId, { stationId, rating });
    return saved;
  }

  async getReviews(stationId: string) {
    return this.reviewRepo.find({
      where: { stationId, isDeleted: false },
      order: { createdAt: 'DESC' },
    });
  }

  // ── Images ──────────────────────────────────────────────

  async addImage(stationId: string, imageType: ImageType, url: string, userId?: string) {
    const existingCount = await this.imageRepo.count({ where: { stationId } });
    if (existingCount >= 3) {
      throw new BadRequestException('Maksimum 3 fotoğraf yüklenebilir');
    }
    const image = this.imageRepo.create({ stationId, imageType, url });
    const saved = await this.imageRepo.save(image);
    if (userId) {
      await this.log(StationAuditAction.IMAGE_UPLOADED, userId, { stationId, imageType, url });
    }
    return saved;
  }

  async getImages(stationId: string) {
    return this.imageRepo.find({ where: { stationId, isDeleted: false } });
  }

  // ── Favorites ───────────────────────────────────────────

  async addFavorite(userId: string, stationId: string, note?: string) {
    const existing = await this.favoriteRepo.findOne({ where: { userId, stationId } });
    if (existing) return existing;
    const saved = await this.favoriteRepo.save(this.favoriteRepo.create({ userId, stationId, note }));
    await this.log(StationAuditAction.FAVORITE_ADDED, userId, { stationId });
    return saved;
  }

  async removeFavorite(userId: string, stationId: string) {
    await this.favoriteRepo.delete({ userId, stationId });
    return { removed: true };
  }

  async getFavorites(userId: string) {
    return this.favoriteRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      relations: ['station'],
    });
  }

  // ── Recently Visited ────────────────────────────────────

  async recordVisit(userId: string, stationId: string) {
    // Use favorites as visit marker; if already a fav, just touch it
    const existing = await this.favoriteRepo.findOne({ where: { userId, stationId } });
    if (existing) {
      existing.createdAt = new Date();
      await this.favoriteRepo.save(existing);
    }
  }

  async getRecentlyVisited(userId: string) {
    return this.favoriteRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 10,
      relations: ['station'],
    });
  }

  // ── Alerts ──────────────────────────────────────────────

  async createAlert(data: Partial<FuelAlert>, userId: string) {
    const alert = this.alertRepo.create({ ...data, userId });
    const saved = await this.alertRepo.save(alert);
    await this.log(StationAuditAction.ALERT_CREATED, userId, { alertId: saved.id, alertType: saved.alertType });
    return saved;
  }

  async getAlerts(userId: string) {
    return this.alertRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async disableAlert(id: string, userId: string) {
    const alert = await this.alertRepo.findOne({ where: { id, userId } });
    if (!alert) throw new NotFoundException('Uyarı bulunamadı');
    alert.status = AlertStatus.DISABLED;
    return this.alertRepo.save(alert);
  }

  async updateAlertSettings(id: string, userId: string, settings: {
    isMuted?: boolean;
    muteUntil?: string;
    repeatFrequency?: number;
  }) {
    const alert = await this.alertRepo.findOne({ where: { id, userId } });
    if (!alert) throw new NotFoundException('Uyarı bulunamadı');
    if (settings.isMuted !== undefined) alert.isMuted = settings.isMuted;
    if (settings.muteUntil) alert.muteUntil = new Date(settings.muteUntil);
    if (settings.repeatFrequency !== undefined) alert.repeatFrequency = settings.repeatFrequency;
    return this.alertRepo.save(alert);
  }

  private async checkPriceAlerts(fuelType: FuelType, newPrice: number, oldPrice: number, station: FuelStation) {
    const alerts = await this.alertRepo.find({
      where: { status: AlertStatus.ACTIVE },
    });

    for (const alert of alerts) {
      if (alert.fuelType && alert.fuelType !== fuelType) continue;

      const now = new Date();
      if (alert.isMuted && alert.muteUntil && now < alert.muteUntil) continue;

      let shouldTrigger = false;
      let message = '';

      switch (alert.alertType) {
        case AlertType.PRICE_THRESHOLD:
          if (alert.priceThreshold && newPrice <= alert.priceThreshold) {
            shouldTrigger = true;
            message = `${station.brand || station.name} istasyonunda ${fuelType} fiyatı ${newPrice} ₺'ye düştü`;
          }
          break;
        case AlertType.PRICE_DROP: {
          if (alert.priceDropPercent && oldPrice > 0) {
            const drop = ((oldPrice - newPrice) / oldPrice) * 100;
            if (drop >= alert.priceDropPercent) {
              shouldTrigger = true;
              message = `${station.brand || station.name} istasyonunda ${fuelType} fiyatı %${drop.toFixed(1)} düştü (${newPrice} ₺)`;
            }
          }
          break;
        }
        case AlertType.BRAND_DISCOUNT:
          if (alert.brand && station.brand === alert.brand && newPrice < oldPrice) {
            shouldTrigger = true;
            message = `${alert.brand} istasyonunda indirim! ${fuelType}: ${newPrice} ₺`;
          }
          break;
        case AlertType.NEW_PRICE_UPDATE:
          if (!alert.brand || station.brand === alert.brand) {
            shouldTrigger = true;
            message = `${station.brand || station.name} güncel ${fuelType} fiyatı: ${newPrice} ₺`;
          }
          break;
      }

      if (!shouldTrigger) continue;
      if (alert.brand && station.brand !== alert.brand) continue;
      if (alert.region && station.city !== alert.region) continue;

      alert.timesTriggered += 1;
      if (alert.repeatFrequency === 0) {
        alert.status = AlertStatus.TRIGGERED;
      }
      await this.alertRepo.save(alert);

      // Send notification with retry
      await withRetry(() =>
        this.notificationsService.create({
          userId: alert.userId,
          type: NotificationType.PRICE_ALERT,
          title: 'Yakıt Fiyat Alarmı',
          message,
          data: { stationId: station.id, fuelType, price: newPrice, alertId: alert.id },
        })
      );

      // WebSocket (non-blocking)
      this.wsGateway.sendToUser(alert.userId, 'fuel_alert_triggered', {
        alertId: alert.id, stationId: station.id, fuelType, price: newPrice, message,
      });

      // Emit event
      this.eventEmitter.emit('fuel.alert.triggered', {
        alertId: alert.id, userId: alert.userId, stationId: station.id,
        fuelType, price: newPrice, timestamp: now,
      });

      await this.log(StationAuditAction.ALERT_TRIGGERED, alert.userId, {
        alertId: alert.id, stationId: station.id, fuelType, price: newPrice, alertType: alert.alertType,
      });
    }
  }

  // ── Working Hours ───────────────────────────────────────

  async setWorkingHours(stationId: string, data: {
    is247?: boolean;
    workingHours?: { day: string; open: string; close: string }[];
    holidayOverrides?: { date: string; open: string; close: string; closed: boolean }[];
    timezone?: string;
  }) {
    await this.findById(stationId);
    const update: any = {};
    if (data.is247 !== undefined) update.is247 = data.is247;
    if (data.workingHours) update.workingHours = data.workingHours;
    if (data.holidayOverrides) update.holidayOverrides = data.holidayOverrides;
    if (data.timezone) update.timezone = data.timezone;
    await this.stationRepo.update(stationId, update);
    return this.findById(stationId);
  }

  // ── Saved Filter Presets ────────────────────────────────

  async createFilter(userId: string, data: Partial<SavedStationFilter>) {
    const filter = this.savedFilterRepo.create({ ...data, userId });
    return this.savedFilterRepo.save(filter);
  }

  async getFilters(userId: string) {
    return this.savedFilterRepo.find({
      where: { userId },
      order: { listOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  async updateFilter(id: string, userId: string, data: Partial<SavedStationFilter>) {
    const filter = await this.savedFilterRepo.findOne({ where: { id, userId } });
    if (!filter) throw new NotFoundException('Filtre bulunamadı');
    await this.savedFilterRepo.update(id, data);
    return this.savedFilterRepo.findOne({ where: { id } });
  }

  async deleteFilter(id: string, userId: string) {
    const filter = await this.savedFilterRepo.findOne({ where: { id, userId } });
    if (!filter) throw new NotFoundException('Filtre bulunamadı');
    await this.savedFilterRepo.delete(id);
    return { deleted: true };
  }

  // ── Audit Log Query ─────────────────────────────────────

  async getAuditLogs(stationId?: string, action?: StationAuditAction, page: number = 1, limit: number = 50) {
    const where: any = {};
    if (stationId) where.stationId = stationId;
    if (action) where.action = action;

    const [logs, total] = await this.auditLogRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { logs, total, page, totalPages: Math.ceil(total / limit) };
  }
}
