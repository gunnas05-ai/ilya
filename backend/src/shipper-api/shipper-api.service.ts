import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shipper } from './entities/shipper.entity';
import { ShipmentStatusHistory } from './entities/shipment-status-history.entity';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { Load } from '../loads/load.entity';
import { MessageBusService } from '../common/message-bus.service';

@Injectable()
export class ShipperApiService {
  private readonly logger = new Logger(ShipperApiService.name);

  constructor(
    @InjectRepository(Shipper) private shipperRepo: Repository<Shipper>,
    @InjectRepository(ShipmentStatusHistory) private historyRepo: Repository<ShipmentStatusHistory>,
    @InjectRepository(Load) private loadRepo: Repository<Load>,
    private messageBus: MessageBusService,
  ) {}

  async createShipment(dto: CreateShipmentDto, userId: string): Promise<Load> {
    const loadData: Partial<Load> = {
      creatorId: userId,
      title: `${dto.cargo.type} — ${dto.origin.address} → ${dto.destination.address}`,
      loadType: 'tam_yuk' as any,
      fromCity: this.extractCity(dto.origin.address),
      fromAddress: dto.origin.address,
      fromDistrict: '',
      toCity: this.extractCity(dto.destination.address),
      toAddress: dto.destination.address,
      toDistrict: '',
      contactName: dto.origin.contact.name,
      contactPhone: dto.origin.contact.phone,
      pickupDate: dto.requiredDate as any,
      deliveryDate: dto.requiredDate as any,
      pickupLatitude: dto.origin.lat,
      pickupLongitude: dto.origin.lng,
      deliveryLatitude: dto.destination.lat,
      deliveryLongitude: dto.destination.lng,
      totalTonnage: dto.cargo.weight / 1000,
      volume: dto.cargo.volume,
      status: 'beklemede' as any,
    };

    const saved = await this.loadRepo.save(loadData as any);

    // Event: shipment.created → Rate API + Carrier matching tetikleme
    await this.messageBus.emit('shipment.created', {
      loadId: saved.id,
      shipperRef: dto.shipperRef,
      origin: dto.origin,
      destination: dto.destination,
      cargo: dto.cargo,
      customsBroker: dto.customsBroker,
    });

    // Status history kaydi
    await this.recordStatusChange(saved.id, '', 'beklemede', userId);

    this.logger.log(`Shipment olusturuldu: ${saved.id} (ref: ${dto.shipperRef})`);
    return saved;
  }

  async getShipment(id: string): Promise<Load> {
    const load = await this.loadRepo.findOne({ where: { id } });
    if (!load) throw new NotFoundException(`Shipment ${id} bulunamadi`);
    return load;
  }

  async getActiveShipments(userId: string): Promise<Load[]> {
    return this.loadRepo.find({
      where: { creatorId: userId, status: 'beklemede' as any },
      order: { createdAt: 'DESC' },
    });
  }

  async cancelShipment(id: string, userId: string): Promise<Load> {
    const load = await this.getShipment(id);
    load.status = 'iptal' as any;
    const saved = await this.loadRepo.save(load);

    await this.messageBus.emit('shipment.cancelled', { loadId: id });
    await this.recordStatusChange(id, 'beklemede', 'iptal', userId);

    return saved;
  }

  async getStatusHistory(shipmentId: string): Promise<ShipmentStatusHistory[]> {
    return this.historyRepo.find({
      where: { shipmentId },
      order: { createdAt: 'DESC' },
    });
  }

  private async recordStatusChange(
    shipmentId: string, from: string, to: string, userId: string,
  ): Promise<void> {
    await this.historyRepo.save({
      shipmentId,
      fromStatus: from,
      toStatus: to,
      changedBy: userId,
      source: 'shipper-api',
    });
  }

  private extractCity(address: string): string {
    const parts = address.split(/[,/]/);
    return parts[0]?.trim() || '';
  }
}
