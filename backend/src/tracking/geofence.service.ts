import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VehiclePosition } from './vehicle-position.entity';
import { MessageBusService } from '../common/message-bus.service';

export interface GeofenceZone {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  type: 'warehouse' | 'pickup' | 'delivery' | 'customs';
}

@Injectable()
export class GeofenceService {
  private readonly logger = new Logger(GeofenceService.name);
  private readonly activeZones: Map<string, GeofenceZone> = new Map();
  private readonly vehicleInZone: Map<string, string> = new Map(); // vehicleId → zoneId

  constructor(
    @InjectRepository(VehiclePosition)
    private vehiclePositionRepo: Repository<VehiclePosition>,
    private messageBus: MessageBusService,
  ) {}

  registerZone(zone: GeofenceZone): void {
    this.activeZones.set(zone.id, zone);
    this.logger.log(`Geofence bolgesi kaydedildi: ${zone.name} (${zone.type})`);
  }

  unregisterZone(zoneId: string): void {
    this.activeZones.delete(zoneId);
  }

  /**
   * Arac pozisyonunu geofence bölgelerine karsi kontrol et.
   * ST_Contains / ST_DWithin ile PostGIS sorgusu yapar.
   */
  async checkPosition(position: VehiclePosition): Promise<void> {
    if (!position.position?.coordinates) return;

    const [lng, lat] = position.position.coordinates;
    const vehicleKey = `${position.shipmentId}-${position.driverId}`;

    for (const zone of this.activeZones.values()) {
      // PostGIS ST_DWithin sorgusu
      const within = await this.isWithinZone(lat, lng, zone.latitude, zone.longitude, zone.radiusMeters);

      const previouslyInZone = this.vehicleInZone.get(vehicleKey);

      if (within && previouslyInZone !== zone.id) {
        // Arac bölgeye GIRDI
        this.vehicleInZone.set(vehicleKey, zone.id);
        this.logger.log(`📍 ${zone.name} giris: ${vehicleKey}`);

        const eventType = zone.type === 'warehouse' ? 'warehouse.vehicle_arrived' :
                         zone.type === 'delivery' ? 'delivery.zone_entered' :
                         'geofence.entered';

        await this.messageBus.emit(eventType, {
          zoneId: zone.id,
          zoneName: zone.name,
          zoneType: zone.type,
          shipmentId: position.shipmentId,
          driverId: position.driverId,
          latitude: lat,
          longitude: lng,
          timestamp: position.timestamp,
        });
      } else if (!within && previouslyInZone === zone.id) {
        // Arac bölgeden CIKTI
        this.vehicleInZone.delete(vehicleKey);
        this.logger.log(`📍 ${zone.name} cikis: ${vehicleKey}`);

        await this.messageBus.emit('geofence.exited', {
          zoneId: zone.id,
          zoneName: zone.name,
          shipmentId: position.shipmentId,
          driverId: position.driverId,
        });
      }
    }
  }

  private async isWithinZone(
    lat: number, lng: number,
    zoneLat: number, zoneLng: number,
    radiusMeters: number,
  ): Promise<boolean> {
    try {
      // PostGIS kullanilabilirse ST_DWithin ile, degilse Haversine ile
      const result = await this.vehiclePositionRepo.query(
        `SELECT ST_DWithin(
          ST_MakePoint($1, $2)::geography,
          ST_MakePoint($3, $4)::geography,
          $5
        ) as within`,
        [lng, lat, zoneLng, zoneLat, radiusMeters],
      );
      return result?.[0]?.within === true;
    } catch {
      // Fallback: Haversine
      return this.haversineDistance(lat, lng, zoneLat, zoneLng) <= radiusMeters;
    }
  }

  private haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
