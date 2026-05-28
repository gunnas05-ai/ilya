import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Carrier } from './entities/carrier.entity';
import { CarrierStatusHistory } from './entities/carrier-status-history.entity';
import { Load, LoadStatus } from '../loads/load.entity';
import { Bid } from '../bids/bid.entity';
import { MessageBusService } from '../common/message-bus.service';
import {
  ShipmentState, canTransition, getTransitionEvent, getAllowedTransitions,
} from './state-machine';
import { AcceptLoadDto, UpdateStatusDto } from './dto/accept-load.dto';

@Injectable()
export class CarrierApiService {
  private readonly logger = new Logger(CarrierApiService.name);

  constructor(
    @InjectRepository(Carrier) private carrierRepo: Repository<Carrier>,
    @InjectRepository(CarrierStatusHistory) private historyRepo: Repository<CarrierStatusHistory>,
    @InjectRepository(Load) private loadRepo: Repository<Load>,
    @InjectRepository(Bid) private bidRepo: Repository<Bid>,
    private messageBus: MessageBusService,
  ) {}

  async getAvailableLoads(filters: {
    lat?: number; lng?: number; radiusKm?: number;
    vehicleType?: string; maxTonnage?: number;
  }): Promise<Load[]> {
    const qb = this.loadRepo.createQueryBuilder('load')
      .where('load.status = :status', { status: 'beklemede' });

    if (filters.vehicleType) {
      qb.andWhere('load.vehicleType = :vt', { vt: filters.vehicleType });
    }
    if (filters.maxTonnage) {
      qb.andWhere('load.totalTonnage <= :ton', { ton: filters.maxTonnage });
    }
    // PostGIS mesafe filtresi (eger aktifse)
    if (filters.lat && filters.lng && filters.radiusKm) {
      qb.andWhere(
        `ST_DWithin(
          ST_MakePoint(COALESCE(load.pickupLongitude, 0), COALESCE(load.pickupLatitude, 0))::geography,
          ST_MakePoint(:lng, :lat)::geography,
          :radius
        )`,
        { lat: filters.lat, lng: filters.lng, radius: filters.radiusKm * 1000 },
      );
    }

    return qb.orderBy('load.createdAt', 'DESC').take(50).getMany();
  }

  async acceptLoad(loadId: string, carrierUserId: string, dto: AcceptLoadDto): Promise<Load> {
    const load = await this.loadRepo.findOne({ where: { id: loadId } });
    if (!load) throw new NotFoundException(`Yuk ${loadId} bulunamadi`);

    if (load.status !== 'beklemede') {
      throw new BadRequestException(`Yuk su an ${load.status} durumunda, kabul edilemez`);
    }

    // Yuku tasiyiciya ata
    load.receiverId = carrierUserId;
    load.status = LoadStatus.YOLDA;
    const saved = await this.loadRepo.save(load);

    // State history
    await this.historyRepo.save({
      loadId,
      carrierId: carrierUserId,
      fromState: 'ASSIGNED',
      toState: 'DISPATCHED',
      latitude: dto.currentLat,
      longitude: dto.currentLng,
      metadata: { plateNumber: dto.plateNumber, driverName: dto.driverName },
    });

    // Event
    await this.messageBus.emit(getTransitionEvent('ASSIGNED', 'DISPATCHED'), {
      loadId,
      carrierId: carrierUserId,
      plateNumber: dto.plateNumber,
      driverName: dto.driverName,
    });

    this.logger.log(`Yuk kabul edildi: ${loadId} → carrier ${carrierUserId}`);
    return saved;
  }

  async updateStatus(loadId: string, carrierUserId: string, dto: UpdateStatusDto): Promise<Load> {
    const load = await this.loadRepo.findOne({ where: { id: loadId } });
    if (!load) throw new NotFoundException(`Yuk ${loadId} bulunamadi`);

    const currentState = this.mapLoadStatusToState(load.status);
    const targetState = dto.status as ShipmentState;

    if (!canTransition(currentState, targetState)) {
      const allowed = getAllowedTransitions(currentState).join(', ');
      throw new BadRequestException(
        `Gecersiz durum gecisi: ${currentState} → ${targetState}. Izin verilenler: ${allowed}`,
      );
    }

    load.status = this.mapStateToLoadStatus(targetState) as LoadStatus;
    const saved = await this.loadRepo.save(load);

    // State history
    await this.historyRepo.save({
      loadId,
      carrierId: carrierUserId,
      fromState: currentState,
      toState: targetState,
      latitude: dto.lat,
      longitude: dto.lng,
      metadata: { note: dto.note },
    });

    // Kafka event
    const eventType = getTransitionEvent(currentState, targetState);
    await this.messageBus.emit(eventType, {
      loadId,
      carrierId: carrierUserId,
      fromState: currentState,
      toState: targetState,
      lat: dto.lat,
      lng: dto.lng,
      note: dto.note,
    });

    this.logger.log(`Durum guncellendi: ${loadId} ${currentState} → ${targetState}`);
    return saved;
  }

  async getStatusHistory(loadId: string): Promise<CarrierStatusHistory[]> {
    return this.historyRepo.find({
      where: { loadId },
      order: { createdAt: 'DESC' },
    });
  }

  private mapLoadStatusToState(status: string): ShipmentState {
    const map: Record<string, ShipmentState> = {
      beklemede: 'ASSIGNED',
      yolda: 'IN_TRANSIT',
      teslim_edildi: 'COMPLETED',
      iptal: 'CANCELLED',
    };
    return map[status] || 'ASSIGNED';
  }

  private mapStateToLoadStatus(state: ShipmentState): string {
    const map: Record<ShipmentState, string> = {
      ASSIGNED: 'beklemede',
      DISPATCHED: 'beklemede',
      IN_TRANSIT: 'yolda',
      ARRIVED: 'yolda',
      UNLOADING: 'yolda',
      COMPLETED: 'teslim_edildi',
      CANCELLED: 'iptal',
      DELAYED: 'yolda',
    };
    return map[state] || 'beklemede';
  }
}
