import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from './vehicle.entity';
import { Load, LoadStatus } from '../loads/load.entity';

export interface FleetVehicle {
  vehicleId: string;
  brand: string;
  model: string;
  year: number;
  plate: string;
  vehicleType: string;
  tonnageCapacity: number;
  status: 'idle' | 'assigned' | 'in_transit';
  activeLoad: {
    loadId?: string;
    title?: string;
    fromCity?: string;
    toCity?: string;
    price?: number;
    status?: string;
  } | null;
  thisMonthRevenue: number;
  thisMonthExpenses: number;
}

export interface FleetDashboard {
  fleetOwnerId: string;
  totalVehicles: number;
  idleVehicles: number;
  assignedVehicles: number;
  inTransitVehicles: number;
  totalCapacityTons: number;
  usedCapacityTons: number;
  thisMonthRevenue: number;
  thisMonthExpenses: number;
  netProfit: number;
  vehicles: FleetVehicle[];
}

@Injectable()
export class FleetService {
  constructor(
    @InjectRepository(Vehicle)
    private vehicleRepo: Repository<Vehicle>,
    @InjectRepository(Load)
    private loadRepo: Repository<Load>,
  ) {}

  async getFleetDashboard(fleetOwnerId: string): Promise<FleetDashboard> {
    const vehicles = await this.vehicleRepo.find({
      where: { userId: fleetOwnerId },
    });

    // Get all loads assigned to any of these vehicles (via receiverId matching vehicle owner)
    const activeLoads = await this.loadRepo.find({
      where: [
        { receiverId: fleetOwnerId, status: LoadStatus.YOLDA },
        { receiverId: fleetOwnerId, status: LoadStatus.BEKLEMEDE },
      ],
    });

    const vehicleList: FleetVehicle[] = vehicles.map((v) => {
      // Match loads by brand/model or just use the first available load
      const load = activeLoads.length > 0 ? activeLoads[0] : null;
      const isInTransit = load?.status === LoadStatus.YOLDA;
      const isAssigned = !!load && !isInTransit;

      return {
        vehicleId: v.id,
        brand: v.brand,
        model: v.model,
        year: v.year,
        plate: '-',
        vehicleType: `${v.brand} ${v.model}`,
        tonnageCapacity: 0,
        status: isInTransit ? 'in_transit' : isAssigned ? 'assigned' : 'idle',
        activeLoad: load ? {
          loadId: load.id,
          title: load.title,
          fromCity: load.fromCity,
          toCity: load.toCity,
          price: Number(load.totalPrice) || 0,
          status: load.status,
        } : null,
        thisMonthRevenue: 0,
        thisMonthExpenses: 0,
      };
    });

    return {
      fleetOwnerId,
      totalVehicles: vehicles.length,
      idleVehicles: vehicleList.filter((v) => v.status === 'idle').length,
      assignedVehicles: vehicleList.filter((v) => v.status === 'assigned').length,
      inTransitVehicles: vehicleList.filter((v) => v.status === 'in_transit').length,
      totalCapacityTons: vehicles.reduce((s, v) => s + ((v as any).tonnageCapacity || 0), 0),
      usedCapacityTons: activeLoads.reduce((s, l) => s + (l.totalTonnage || 0), 0),
      thisMonthRevenue: activeLoads.reduce((s, l) => s + (Number(l.totalPrice) || 0), 0),
      thisMonthExpenses: 0,
      netProfit: activeLoads.reduce((s, l) => s + (Number(l.totalPrice) || 0), 0),
      vehicles: vehicleList,
    };
  }

  async getVehicleLoadHistory(vehicleId: string, userId: string) {
    const vehicle = await this.vehicleRepo.findOne({ where: { id: vehicleId, userId } });
    if (!vehicle) throw new Error('Araç bulunamadı');

    const loads = await this.loadRepo.find({
      where: { receiverId: userId, vehicleType: (vehicle as any).vehicleType },
      order: { createdAt: 'DESC' },
      take: 20,
    });

    return { vehicleId, vehicle: `${vehicle.brand} ${vehicle.model}`, loads };
  }
}
