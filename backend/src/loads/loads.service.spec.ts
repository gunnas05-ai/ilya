import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LoadsService } from './loads.service';
import { Load, LoadStatus, LoadType } from './load.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('LoadsService', () => {
  let service: LoadsService;
  let loadRepo: jest.Mocked<Partial<Repository<Load>>>;
  let eventEmitter: jest.Mocked<Partial<EventEmitter2>>;

  const mockLoad: Partial<Load> = {
    id: 'load-1',
    loadNo: '20260522093000123',
    title: 'Test Yükü',
    loadType: LoadType.TAM_YUK,
    fromCity: 'İstanbul',
    toCity: 'Ankara',
    status: LoadStatus.BEKLEMEDE,
    totalPrice: 25000,
    isAuction: false,
    escrow: true,
    creatorId: 'shipper-1',
    receiverId: undefined,
    reservedById: undefined,
    bidCount: 0,
    version: 0,
  };

  beforeEach(async () => {
    loadRepo = {
      create: jest.fn().mockReturnValue(mockLoad),
      save: jest.fn().mockResolvedValue(mockLoad),
      findOne: jest.fn().mockResolvedValue(mockLoad),
      find: jest.fn().mockResolvedValue([mockLoad]),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockLoad], 1]),
        getRawOne: jest.fn().mockResolvedValue({ avgPrice: 24000, count: 5 }),
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      }),
    } as any;

    eventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoadsService,
        { provide: getRepositoryToken(Load), useValue: loadRepo },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<LoadsService>(LoadsService);
  });

  describe('create', () => {
    it('should create a load with generated loadNo', async () => {
      const result = await service.create({
        title: 'Test Yükü',
        loadType: LoadType.TAM_YUK,
        fromCity: 'İstanbul',
        toCity: 'Ankara',
      } as any, 'shipper-1');

      expect(result).toBeDefined();
      expect(eventEmitter.emit).toHaveBeenCalledWith('load.created', expect.any(Object));
    });

    it('should reject description over 300 chars', async () => {
      await expect(
        service.create({ description: 'x'.repeat(301) } as any, 'shipper-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('instantBook', () => {
    it('should reject auction loads', async () => {
      loadRepo.findOne.mockResolvedValue({ ...mockLoad, isAuction: true } as Load);
      await expect(
        service.instantBook('load-1', 'carrier-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if shipper tries to take own load', async () => {
      await expect(
        service.instantBook('load-1', 'shipper-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findById', () => {
    it('should return load by id', async () => {
      const result = await service.findById('load-1');
      expect(result.id).toBe('load-1');
    });

    it('should throw NotFoundException on missing load', async () => {
      loadRepo.findOne.mockResolvedValue(null);
      await expect(service.findById('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('recommendedLoads', () => {
    it('should return scored recommendations', async () => {
      loadRepo.find.mockResolvedValue([mockLoad as Load]);
      const result = await service.recommendedLoads({
        carrierVehicleType: 'Çekici (TIR)',
        currentLatitude: 41,
        currentLongitude: 29,
        maxEmptyKm: 300,
      });
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThanOrEqual(0);
    });
  });
});
