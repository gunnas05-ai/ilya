import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Warehouse, WarehouseAppointment, Dock } from './entities/warehouse.entity';
import { MessageBusService } from '../common/message-bus.service';

@Injectable()
export class WarehouseService {
  private readonly logger = new Logger(WarehouseService.name);

  constructor(
    @InjectRepository(Warehouse) private warehouseRepo: Repository<Warehouse>,
    @InjectRepository(WarehouseAppointment) private appointmentRepo: Repository<WarehouseAppointment>,
    @InjectRepository(Dock) private dockRepo: Repository<Dock>,
    private messageBus: MessageBusService,
  ) {}

  async requestAppointment(data: {
    warehouseId: string;
    loadId: string;
    type: 'loading' | 'unloading';
    requestedDate: Date;
    plateNumber?: string;
    driverName?: string;
    notes?: string;
  }): Promise<WarehouseAppointment> {
    const warehouse = await this.warehouseRepo.findOne({ where: { id: data.warehouseId } });
    if (!warehouse) throw new NotFoundException('Depo bulunamadi');

    // Müsait rampa bul
    const availableDock = await this.dockRepo.findOne({
      where: { warehouseId: data.warehouseId, isAvailable: true, type: data.type === 'loading' ? data.type : data.type },
    });

    const appointment = this.appointmentRepo.create({
      ...data,
      dockId: availableDock?.id,
      status: 'pending',
    });

    const saved = await this.appointmentRepo.save(appointment);

    // Rampa atamasi yapildiysa event
    if (availableDock) {
      // Dock'u gecici olarak isaretle
      availableDock.isAvailable = false;
      await this.dockRepo.save(availableDock);

      await this.messageBus.emit('warehouse.dock.assigned', {
        appointmentId: saved.id,
        warehouseId: data.warehouseId,
        loadId: data.loadId,
        dockNumber: availableDock.dockNumber,
      });

      this.logger.log(`Rampa atandi: ${availableDock.dockNumber} → yuk ${data.loadId}`);
    }

    return saved;
  }

  async getDocks(warehouseId: string): Promise<Dock[]> {
    return this.dockRepo.find({ where: { warehouseId } });
  }

  async updateAppointment(
    id: string,
    data: { status?: string; dockId?: string; notes?: string },
  ): Promise<WarehouseAppointment> {
    const appointment = await this.appointmentRepo.findOne({ where: { id } });
    if (!appointment) throw new NotFoundException('Randevu bulunamadi');

    if (data.status === 'completed') {
      // Rampayi serbest birak
      if (appointment.dockId) {
        await this.dockRepo.update(appointment.dockId, { isAvailable: true });
      }

      await this.messageBus.emit('warehouse.departed', {
        appointmentId: id,
        warehouseId: appointment.warehouseId,
        loadId: appointment.loadId,
      });
    }

    Object.assign(appointment, data);
    return this.appointmentRepo.save(appointment);
  }

  async getAvailableDocks(warehouseId: string): Promise<Dock[]> {
    return this.dockRepo.find({ where: { warehouseId, isAvailable: true } });
  }
}
