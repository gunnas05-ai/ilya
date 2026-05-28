import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { RateAgreement } from './entities/rate-agreement.entity';
import { PriceEstimateService } from '../loads/price-estimate.service';

interface QuoteRequest {
  fromCity: string;
  toCity: string;
  distanceKm?: number;
  loadType?: string;
  tonnage?: number;
  vehicleType?: string;
  trailerType?: string;
  coldChain?: boolean;
}

export interface QuoteResult {
  minPrice: number;
  maxPrice: number;
  currency: string;
  validUntil: string;
  breakdown: Record<string, any>;
  cacheHit?: boolean;
}

@Injectable()
export class RateApiService {
  private readonly logger = new Logger(RateApiService.name);

  constructor(
    @InjectRepository(RateAgreement) private agreementRepo: Repository<RateAgreement>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private priceEstimateService: PriceEstimateService,
  ) {}

  async getQuote(req: QuoteRequest): Promise<QuoteResult> {
    const cacheKey = `rate:${req.fromCity}:${req.toCity}:${req.vehicleType || 'any'}:${req.loadType || 'any'}`;

    // Redis cache check
    try {
      const cached = await this.cacheManager.get<QuoteResult>(cacheKey);
      if (cached) {
        return { ...cached, cacheHit: true };
      }
    } catch {
      // Cache miss — devam et
    }

    // Mevcut PriceEstimateService ile fiyat hesapla
    const estimate = await this.priceEstimateService.calculate({
      fromCity: req.fromCity,
      toCity: req.toCity,
      distanceKm: req.distanceKm,
      loadType: req.loadType,
      tonnage: req.tonnage,
      vehicleType: req.vehicleType,
      trailerType: req.trailerType,
      coldChain: req.coldChain,
    });

    // Sozlesmeli tarife kontrolu
    let discountPct = 0;
    try {
      const agreement = await this.agreementRepo.findOne({
        where: {
          fromCity: req.fromCity,
          toCity: req.toCity,
          isActive: true,
        },
        order: { discountPct: 'DESC' },
      });
      if (agreement) discountPct = agreement.discountPct;
    } catch {
      // Agreement sorgusu basarisiz — indirim uygulama
    }

    const baseMinPrice = (estimate as any)?.minPrice || (estimate as any)?.estimate?.minPrice || 0;
    const baseMaxPrice = (estimate as any)?.maxPrice || (estimate as any)?.estimate?.maxPrice || 0;
    const minPrice = baseMinPrice * (1 - discountPct / 100);
    const maxPrice = baseMaxPrice * (1 - discountPct / 100);
    const validUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 dk

    const result: QuoteResult = {
      minPrice: Math.round(minPrice),
      maxPrice: Math.round(maxPrice),
      currency: 'TRY',
      validUntil,
      breakdown: {
        fuelCost: (estimate as any)?.fuelCost || 0,
        fuelPricePerLiter: (estimate as any)?.fuelPrices?.motorin || 0,
        distanceKm: req.distanceKm || 0,
        discountApplied: discountPct > 0 ? `%${discountPct}` : 'Yok',
        laneAvgRate: (estimate as any)?.laneData?.avgRate || null,
        trend: (estimate as any)?.laneData?.trend || null,
      },
    };

    // Cache'e yaz (15 dk TTL)
    try {
      await this.cacheManager.set(cacheKey, result, 900);
    } catch {
      // Cache yazma hatasi — sessizce devam et
    }

    return result;
  }

  async getQuoteBatch(requests: QuoteRequest[]): Promise<QuoteResult[]> {
    if (requests.length > 50) {
      throw new Error('Toplu sorgu limiti: maksimum 50');
    }
    return Promise.all(requests.map((req) => this.getQuote(req)));
  }

  async getAgreements(shipperId: string): Promise<RateAgreement[]> {
    return this.agreementRepo.find({
      where: { shipperId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }
}
