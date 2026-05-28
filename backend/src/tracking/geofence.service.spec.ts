import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GeofenceService } from './geofence.service';
import { VehiclePosition } from './vehicle-position.entity';
import { MessageBusService } from '../common/message-bus.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('GeofenceService', () => {
  let service: GeofenceService;
  let vehicleRepo: any;
  let messageBus: any;

  const mockPosition: Partial<VehiclePosition> = {
    shipmentId: 'shp-1',
    driverId: 'drv-1',
    position: { type: 'Point', coordinates: [29.0, 41.0] },
    speed: 60,
    heading: 90,
    timestamp: new Date(),
  };

  beforeEach(async () => {
    vehicleRepo = {
      query: jest.fn().mockResolvedValue([{ within: true }]),
    };
    messageBus = {
      emit: jest.fn(),
      on: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeofenceService,
        { provide: getRepositoryToken(VehiclePosition), useValue: vehicleRepo },
        { provide: MessageBusService, useValue: messageBus },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get<GeofenceService>(GeofenceService);
  });

  describe('registerZone / checkPosition', () => {
    it('zone kayit eder ve kontrol eder', () => {
      service.registerZone({
        id: 'zone-1',
        name: 'Test Deposu',
        latitude: 41.0,
        longitude: 29.0,
        radiusMeters: 5000,
        type: 'warehouse',
      });

      expect(() => service.checkPosition(mockPosition as VehiclePosition))
        .not.toThrow();
    });

    it('arac zone\'a girince warehouse.vehicle_arrived event\'i gonderir', async () => {
      service.registerZone({
        id: 'zone-1',
        name: 'Ana Depo',
        latitude: 41.0,
        longitude: 29.0,
        radiusMeters: 5000,
        type: 'warehouse',
      });

      await service.checkPosition(mockPosition as VehiclePosition);

      expect(messageBus.emit).toHaveBeenCalledWith(
        'warehouse.vehicle_arrived',
        expect.objectContaining({
          zoneId: 'zone-1',
          zoneName: 'Ana Depo',
        }),
      );
    });

    it('zone disinda ise event gonderilmez', async () => {
      vehicleRepo.query.mockResolvedValue([{ within: false }]);
      service.registerZone({
        id: 'zone-2',
        name: 'Uzak Depo',
        latitude: 50.0,
        longitude: 30.0,
        radiusMeters: 1000,
        type: 'delivery',
      });

      await service.checkPosition(mockPosition as VehiclePosition);

      expect(messageBus.emit).not.toHaveBeenCalled();
    });

    it('zone kaldirilinca artik kontrol edilmez', async () => {
      service.registerZone({
        id: 'zone-3',
        name: 'Gecici',
        latitude: 41.0,
        longitude: 29.0,
        radiusMeters: 10000,
        type: 'pickup',
      });
      service.unregisterZone('zone-3');

      await service.checkPosition(mockPosition as VehiclePosition);
      expect(messageBus.emit).not.toHaveBeenCalled();
    });
  });
});
