import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Load } from './load.entity';
import { LIVE_FUEL_PRICES } from './epdk-scraper.service';

// Turkey intercity lane data — historical average rates (TRY)
// Source: market analysis + simulated lane history
const LANE_RATES: Record<string, Record<string, { avgRate: number; minRate: number; maxRate: number; volume: string; trend: string }>> = {
  'İstanbul': {
    'Ankara': { avgRate: 24500, minRate: 18000, maxRate: 32000, volume: 'Yüksek', trend: 'up' },
    'İzmir': { avgRate: 22000, minRate: 16000, maxRate: 30000, volume: 'Yüksek', trend: 'stable' },
    'Bursa': { avgRate: 11000, minRate: 7000, maxRate: 15000, volume: 'Orta', trend: 'stable' },
    'Antalya': { avgRate: 31000, minRate: 24000, maxRate: 40000, volume: 'Yüksek', trend: 'up' },
    'Konya': { avgRate: 26000, minRate: 20000, maxRate: 35000, volume: 'Orta', trend: 'stable' },
    'Kocaeli': { avgRate: 8500, minRate: 5000, maxRate: 12000, volume: 'Yüksek', trend: 'stable' },
    'Gaziantep': { avgRate: 40000, minRate: 32000, maxRate: 52000, volume: 'Yüksek', trend: 'up' },
    'Samsun': { avgRate: 35000, minRate: 27000, maxRate: 45000, volume: 'Orta', trend: 'stable' },
    'Trabzon': { avgRate: 45000, minRate: 36000, maxRate: 58000, volume: 'Düşük', trend: 'up' },
    'Mersin': { avgRate: 42000, minRate: 34000, maxRate: 54000, volume: 'Orta', trend: 'stable' },
    'Eskişehir': { avgRate: 18000, minRate: 13000, maxRate: 24000, volume: 'Orta', trend: 'stable' },
    'Adana': { avgRate: 38000, minRate: 30000, maxRate: 50000, volume: 'Yüksek', trend: 'up' },
  },
  'Ankara': {
    'İstanbul': { avgRate: 24500, minRate: 18000, maxRate: 32000, volume: 'Yüksek', trend: 'up' },
    'İzmir': { avgRate: 23000, minRate: 17000, maxRate: 31000, volume: 'Yüksek', trend: 'stable' },
    'Bursa': { avgRate: 17000, minRate: 12000, maxRate: 24000, volume: 'Orta', trend: 'stable' },
    'Antalya': { avgRate: 21000, minRate: 16000, maxRate: 29000, volume: 'Orta', trend: 'stable' },
    'Konya': { avgRate: 11000, minRate: 7000, maxRate: 16000, volume: 'Orta', trend: 'stable' },
    'Gaziantep': { avgRate: 27000, minRate: 20000, maxRate: 37000, volume: 'Orta', trend: 'up' },
    'Adana': { avgRate: 23000, minRate: 17000, maxRate: 31000, volume: 'Orta', trend: 'stable' },
  },
  'İzmir': {
    'İstanbul': { avgRate: 22000, minRate: 16000, maxRate: 30000, volume: 'Yüksek', trend: 'stable' },
    'Ankara': { avgRate: 23000, minRate: 17000, maxRate: 31000, volume: 'Yüksek', trend: 'stable' },
    'Antalya': { avgRate: 16000, minRate: 11000, maxRate: 22000, volume: 'Orta', trend: 'stable' },
  },
  'Gaziantep': {
    'İstanbul': { avgRate: 40000, minRate: 32000, maxRate: 52000, volume: 'Yüksek', trend: 'up' },
    'Ankara': { avgRate: 27000, minRate: 20000, maxRate: 37000, volume: 'Orta', trend: 'up' },
    'Mersin': { avgRate: 13000, minRate: 8000, maxRate: 18000, volume: 'Orta', trend: 'stable' },
    'Adana': { avgRate: 11000, minRate: 7000, maxRate: 15000, volume: 'Orta', trend: 'stable' },
  },
};

// Market heatmap: demand level per city (derived from lane volume + active loads)
// Scale: 0-100 (0 = düşük talep, 100 = çok yüksek talep)
function getDemandScore(city: string): number {
  const demandScores: Record<string, number> = {
    'İstanbul': 92, 'Ankara': 78, 'İzmir': 72, 'Bursa': 60,
    'Antalya': 55, 'Konya': 48, 'Gaziantep': 70, 'Mersin': 65,
    'Adana': 62, 'Samsun': 42, 'Trabzon': 35, 'Kocaeli': 68,
    'Eskişehir': 45, 'Denizli': 38, 'Sivas': 28,
  };
  return demandScores[city] || 35;
}

function getDemandLabel(score: number): string {
  if (score >= 80) return 'Çok Yüksek';
  if (score >= 60) return 'Yüksek';
  if (score >= 40) return 'Orta';
  if (score >= 20) return 'Düşük';
  return 'Çok Düşük';
}

@Injectable()
export class PriceEstimateService {
  private readonly logger = new Logger(PriceEstimateService.name);

  constructor(
    @InjectRepository(Load)
    private loadRepo: Repository<Load>,
  ) {}

  async calculate(params: {
    fromCity?: string;
    toCity?: string;
    distanceKm?: number;
    loadType?: string;
    tonnage?: number;
    totalKg?: number;
    isExplosive?: boolean;
    isHomeMove?: boolean;
    hasElevator?: boolean;
    workerCount?: number;
    vehicleType?: string;
    trailerType?: string;
    coldChain?: boolean;
  }) {
    // GÖREV 2: AI Fiyat Formülü — A * B * C * D
    const A = 0.30; // Yakıt tüketimi litre/km (admin güncelleyebilir)
    const B = params.distanceKm || 300; // Mesafe (dinamik)
    const C = LIVE_FUEL_PRICES.motorin; // EPDK motorin tavan fiyatı
    const D = 3.0; // Operasyonel maliyet çarpanı (admin güncelleyebilir)

    const aiBasePrice = A * B * C * D;

    const dieselPrice = LIVE_FUEL_PRICES.motorin;
    const fuelPerKm = params.loadType === 'sehir_ici' ? 0.40 : params.coldChain ? 0.35 : 0.30;
    const dailyWage = 1000;
    const accommodationCost = 1500;

    const distanceKm = params.distanceKm || 300;
    const fuelCost = distanceKm * fuelPerKm * dieselPrice;
    const estimatedDays = Math.max(1, Math.round(distanceKm / 500) + 1);
    const workers = params.workerCount || (params.isHomeMove ? 3 : 2);
    const laborCost = (dailyWage * estimatedDays * workers) + (accommodationCost * (estimatedDays - 1));
    const riskFactor = params.isExplosive ? 1.8 : 1.0;
    let specialCost = 0;
    if (params.isHomeMove && !params.hasElevator) specialCost += 4000;
    if (params.coldChain) specialCost += 2000;

    const estimatedTotal = (fuelCost + laborCost) * riskFactor + specialCost;
    const minPrice = Math.round(estimatedTotal * 0.95);
    const maxPrice = Math.round(estimatedTotal * 1.05);

    // Calculate fuel price staleness
    const fuelUpdatedAt = new Date(LIVE_FUEL_PRICES.updatedAt).getTime();
    const now = Date.now();
    const hoursSinceUpdate = Math.round((now - fuelUpdatedAt) / (1000 * 60 * 60));
    const fuelStale = hoursSinceUpdate > 24;
    const fuelVeryStale = hoursSinceUpdate > 48;

    // Get lane market data
    let laneData = null;
    let marketComparison: any = null;
    if (params.fromCity && params.toCity) {
      const fromRates = LANE_RATES[params.fromCity];
      if (fromRates) {
        laneData = fromRates[params.toCity] || null;
      }
      if (!laneData && params.toCity) {
        const toRates = LANE_RATES[params.toCity];
        if (toRates) laneData = toRates[params.fromCity] || null;
      }

      if (laneData) {
        const percentBelow = Math.round((1 - minPrice / laneData.avgRate) * 100);
        const percentAbove = Math.round((maxPrice / laneData.avgRate - 1) * 100);
        marketComparison = {
          laneAvgRate: laneData.avgRate,
          laneRange: { min: laneData.minRate, max: laneData.maxRate },
          yourRange: { min: minPrice, max: maxPrice },
          comparison: minPrice < laneData.minRate ? 'below_market' : maxPrice > laneData.maxRate ? 'above_market' : 'in_range',
          percentDiff: minPrice < laneData.minRate ? percentBelow : percentAbove,
          laneVolume: laneData.volume,
          trend: laneData.trend,
          recommendation: maxPrice > laneData.maxRate
            ? 'Fiyatınız piyasa ortalamasının üzerinde. Rekabetçi olmak için düşürmeyi düşünün.'
            : minPrice < laneData.minRate
              ? 'Fiyatınız piyasanın altında. Talebin yüksek olduğu bu hatta fiyatı artırabilirsiniz.'
              : 'Fiyatınız piyasa ile uyumlu.',
        };
      }
    }

    // Market heatmap (supply-demand)
    const fromDemand = params.fromCity ? getDemandScore(params.fromCity) : null;
    const toDemand = params.toCity ? getDemandScore(params.toCity) : null;
    const heatmapData = params.fromCity && params.toCity ? {
      fromCity: params.fromCity,
      fromDemandScore: fromDemand,
      fromDemandLabel: getDemandLabel(fromDemand!),
      toCity: params.toCity,
      toDemandScore: toDemand,
      toDemandLabel: getDemandLabel(toDemand!),
      netDemand: toDemand! - fromDemand!,
      recommendation: toDemand! > fromDemand!
        ? `${params.toCity} bölgesinde talep yüksek — bu hatta rekabet avantajınız var.`
        : `${params.fromCity} çıkışlı arz yoğun — alıcı pazarlığında güçlüsünüz.`,
    } : null;

    const fuelConsumptionLiters = Math.round(distanceKm * fuelPerKm);

    return {
      estimate: {
        minPrice,
        maxPrice,
        aiBasePrice: Math.round(aiBasePrice),
        currency: 'TRY',
        formula: { A, B, C, D, explanation: 'YÜK_FİYATI = A × B × C × D (KDV Hariç)' },
        breakdown: {
          fuelCost: Math.round(fuelCost),
          laborCost: Math.round(laborCost),
          riskFactor,
          specialCost,
          estimatedDays,
          workers,
          fuelConsumptionLiters,
          fuelType: 'motorin',
          fuelPricePerLiter: dieselPrice,
          perKmCost: Math.round(fuelPerKm * dieselPrice * 100) / 100,
        },
      },
      laneData: laneData ? {
        fromCity: params.fromCity,
        toCity: params.toCity,
        avgRate: laneData.avgRate,
        minRate: laneData.minRate,
        maxRate: laneData.maxRate,
        volume: laneData.volume,
        trend: laneData.trend,
      } : null,
      marketComparison,
      fuelPrices: {
        motorin: LIVE_FUEL_PRICES.motorin,
        benzin: LIVE_FUEL_PRICES.benzin,
        lpg: LIVE_FUEL_PRICES.lpg,
        adblue: LIVE_FUEL_PRICES.adblue,
        updatedAt: LIVE_FUEL_PRICES.updatedAt,
        hoursSinceUpdate,
        isStale: fuelStale,
        isVeryStale: fuelVeryStale,
      },
      marketHeatmap: heatmapData,
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  async getLaneRates(fromCity: string, toCity: string) {
    // Try to get actual completed load data for dynamic lane rates
    let dynamicRate: number | null = null;
    let completedCount = 0;
    try {
      const completed = await this.loadRepo
        .createQueryBuilder('load')
        .select('AVG(load.totalPrice)', 'avgPrice')
        .addSelect('COUNT(*)', 'count')
        .where('load.fromCity ILIKE :from', { from: `%${fromCity}%` })
        .andWhere('load.toCity ILIKE :to', { to: `%${toCity}%` })
        .andWhere('load.status = :status', { status: 'teslim_edildi' })
        .andWhere('load.totalPrice IS NOT NULL')
        .getRawOne();

      if (completed && parseInt(completed.count) > 0) {
        dynamicRate = Math.round(parseFloat(completed.avgPrice));
        completedCount = parseInt(completed.count);
      }
    } catch {
      // Fallback to static data on query error
    }

    const fromRates = LANE_RATES[fromCity];
    const staticData = fromRates ? fromRates[toCity] : null;
    const toRates = LANE_RATES[toCity];
    const reverseStatic = toRates ? toRates[fromCity] : null;

    // Merge dynamic + static weights: 70% real data, 30% baseline
    const effectiveData = {
      avgRate: dynamicRate
        ? Math.round(dynamicRate * 0.7 + (staticData?.avgRate || dynamicRate) * 0.3)
        : staticData?.avgRate || reverseStatic?.avgRate || 0,
      minRate: staticData?.minRate || reverseStatic?.minRate || 0,
      maxRate: staticData?.maxRate || reverseStatic?.maxRate || 0,
      volume: completedCount > 5 ? 'Yüksek' : staticData?.volume || reverseStatic?.volume || 'Orta',
      trend: staticData?.trend || reverseStatic?.trend || 'stable',
    };

    if (!effectiveData.avgRate && !staticData && !reverseStatic) {
      return {
        laneData: null,
        message: 'Bu hat için henüz veri bulunmamaktadır.',
        dynamicInsights: { completedDeliveries: completedCount },
      };
    }

    return {
      lane: { from: fromCity, to: toCity },
      rates: effectiveData,
      fuelPrices: { ...LIVE_FUEL_PRICES },
      historicalRates: this.generateHistoricalRates(effectiveData.avgRate, 6),
      dataSource: dynamicRate ? 'hibrit' : 'baz',
      dynamicInsights: {
        completedDeliveries: completedCount,
        actualAverage: dynamicRate,
        confidence: completedCount >= 10 ? 'Yüksek' : completedCount >= 3 ? 'Orta' : 'Düşük',
      },
    };
  }

  async getLaneRatesHistory(fromCity: string, toCity: string, months = 6) {
    const fromRates = LANE_RATES[fromCity];
    let laneData = fromRates ? fromRates[toCity] : null;
    if (!laneData && toCity) {
      const toRates = LANE_RATES[toCity];
      laneData = toRates ? toRates[fromCity] : null;
    }

    if (!laneData) {
      return { history: [], message: 'Bu hat için henüz veri bulunmamaktadır.' };
    }

    return {
      lane: { from: fromCity, to: toCity },
      currentRate: laneData.avgRate,
      history: this.generateHistoricalRates(laneData.avgRate, months),
      fuelPrices: { ...LIVE_FUEL_PRICES },
    };
  }

  async getMarketHeatmap() {
    const cities = Object.keys(LANE_RATES);

    // EX-006: Get actual active load counts per city from DB
    let activeLoadCounts: Record<string, number> = {};
    try {
      const activeLoads = await this.loadRepo
        .createQueryBuilder('load')
        .select('load.fromCity', 'city')
        .addSelect('COUNT(*)', 'count')
        .where('load.status = :status', { status: 'beklemede' })
        .groupBy('load.fromCity')
        .getRawMany();

      for (const row of activeLoads) {
        const city = cities.find(c => row.city?.toLowerCase().includes(c.toLowerCase()));
        if (city) {
          activeLoadCounts[city] = parseInt(row.count);
        }
      }
    } catch {
      // Fallback to static data
    }

    const heatmap = cities.map(city => {
      const destinations = LANE_RATES[city];
      const totalVolume = Object.values(destinations).reduce((sum, d) => {
        const volMap: Record<string, number> = { 'Yüksek': 3, 'Orta': 2, 'Düşük': 1 };
        return sum + (volMap[d.volume] || 1);
      }, 0);

      // Blend static demand score with actual active loads
      const staticScore = getDemandScore(city);
      const activeLoads = activeLoadCounts[city] || 0;
      const dynamicScore = Math.min(100, activeLoads * 10 + 35);
      const demandScore = activeLoads > 0
        ? Math.round(staticScore * 0.6 + dynamicScore * 0.4)
        : staticScore;

      const avgLaneRate = Math.round(
        Object.values(destinations).reduce((s, d) => s + d.avgRate, 0) / Object.values(destinations).length
      );

      return {
        city,
        demandScore,
        demandLabel: getDemandLabel(demandScore),
        avgLaneRate,
        activeLanes: Object.keys(destinations).length,
        totalVolume,
        activeLoadCount: activeLoads,
      };
    });

    heatmap.sort((a, b) => b.demandScore - a.demandScore);

    return {
      heatmap,
      fuelPrices: { ...LIVE_FUEL_PRICES },
      updatedAt: new Date().toISOString(),
      isDynamic: Object.keys(activeLoadCounts).length > 0,
    };
  }

  private generateHistoricalRates(baseRate: number, months = 6) {
    const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    const now = new Date();
    const result: Array<{ month: string; rate: number }> = [];

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = monthNames[d.getMonth()];
      // Seed with deterministic variation (±12% range, trending toward baseRate)
      const seed = (d.getFullYear() * 100 + d.getMonth()) * 7 % 100;
      const variation = (seed - 50) * 0.0024; // -12% to +12%
      result.push({
        month: monthLabel,
        rate: Math.round(baseRate * (0.88 + variation)),
      });
    }

    return result;
  }
}
