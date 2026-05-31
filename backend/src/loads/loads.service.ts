import { Injectable, NotFoundException, BadRequestException, Optional, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Load, LoadType, LoadStatus } from './load.entity';
import { calculateDistance } from '../common/distance';

export interface ISubscriptionService {
  getActiveSubscription(userId: string): Promise<{ status: string; planId: string } | null>;
  canCreateLoad(userId: string): Promise<boolean>;
}

@Injectable()
export class LoadsService {
  constructor(
    @InjectRepository(Load)
    private loadRepo: Repository<Load>,
    private eventEmitter: EventEmitter2,
    @Optional() @Inject('ISubscriptionService') private subscriptionService?: ISubscriptionService,
    @Optional() @InjectRepository('InvoiceRepository' as any)
    private invoiceRepo?: Repository<any>,
    @Optional() @InjectRepository('EscrowTransactionRepository' as any)
    private escrowRepo?: Repository<any>,
  ) {}

  async create(data: Partial<Load>, creatorId: string) {
    // Abonelik kontrolü
    if (this.subscriptionService) {
      const sub = await this.subscriptionService.getActiveSubscription(creatorId);
      if (!sub) {
        throw new BadRequestException('Yük oluşturmak için aktif bir aboneliğiniz olması gerekir. Lütfen bir paket satın alın.');
      }
    }

    if (data.description && data.description.length > 300) {
      throw new BadRequestException('Açıklama maksimum 300 karakter olabilir');
    }

    const routeDistance = calculateDistance(
      data.pickupLatitude || 0,
      data.pickupLongitude || 0,
      data.deliveryLatitude || 0,
      data.deliveryLongitude || 0,
    );

    // ═══ FİYATLANDIRMA MOTORU (Spec 01 §2.3) ═══
    const KDV_RATE = 0.20; // %20 KDV
    let computedPrice = Number(data.totalPrice) || 0;

    // Tonaj Bazlı → Toplam = Tonaj × Ton Başı Fiyat + %20 KDV
    if ((data as any).pricingType === 'tonnage' && (data as any).totalTonnage > 0 && (data as any).pricePerTon > 0) {
      const net = (data as any).totalTonnage * (data as any).pricePerTon;
      computedPrice = net + (net * KDV_RATE);
    }
    // Komple/Adet Bazlı → Toplam = Sabit Fiyat + %20 KDV
    else if ((data as any).pricingType === 'fixed' && computedPrice > 0) {
      computedPrice = computedPrice + (computedPrice * KDV_RATE);
    }
    // Doğrudan fiyat verilmişse KDV dahil et
    else if (computedPrice > 0) {
      computedPrice = computedPrice + (computedPrice * KDV_RATE);
    }

    // İhale entegrasyonu
    const isAuction = !!(data as any).auctionEnabled;

    // Generate load number: YYYYMMDDHHmmss + 3 random digits
    const now = new Date();
    const y = now.getFullYear();
    const mo = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const h = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    const rand = String(Math.floor(Math.random() * 900) + 100);
    const loadNo = `${y}${mo}${d}${h}${mi}${s}${rand}`;

    const load = this.loadRepo.create({
      ...data,
      creatorId,
      loadNo,
      routeDistance,
      totalPrice: Math.round(computedPrice * 100) / 100,
      status: LoadStatus.BEKLEMEDE,
      bidCount: 0,
    } as any);
    const saved = await this.loadRepo.save(load as any) as unknown as Load;

    this.eventEmitter.emit('load.created', {
      loadId: saved.id,
      loadNo: saved.loadNo,
      loadType: saved.loadType,
      fromCity: saved.fromCity,
      toCity: saved.toCity,
      status: saved.status,
      creatorId: saved.creatorId,
      createdAt: saved.createdAt,
      totalPrice: saved.totalPrice,
      isAuction,
      escrowEnabled: !!(data as any).escrowEnabled,
      insuranceEnabled: !!(data as any).insuranceEnabled,
    });

    return saved;
  }

  async findAll(filters: {
    page?: number;
    limit?: number;
    search?: string;
    loadType?: string;
    fromCity?: string;
    toCity?: string;
    vehicleType?: string;
    trailerType?: string;
    coldChain?: boolean;
    urgent?: boolean;
    escrow?: boolean;
    minTonnage?: number;
    maxTonnage?: number;
    minVolume?: number;
    maxVolume?: number;
    minDistance?: number;
    maxDistance?: number;
    dateFrom?: string;
    dateTo?: string;
    nearbyLatitude?: number;
    nearbyLongitude?: number;
    nearbyRadiusKm?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }) {
    const page = Math.min(filters.page || 1, 50); // maxSkip = 50 * limit
    const limit = Math.min(filters.limit || 20, 100);
    const query = this.loadRepo.createQueryBuilder('load')
      .where('load.status != :deletedStatus', { deletedStatus: LoadStatus.IPTAL });

    if (filters.search) {
      const q = `%${filters.search}%`;
      query.andWhere(new Brackets((qb) => {
        qb.where('load.title ILIKE :q', { q })
          .orWhere('load.fromCity ILIKE :q', { q })
          .orWhere('load.toCity ILIKE :q', { q });
      }));
    }

    if (filters.loadType) query.andWhere('load.loadType = :loadType', { loadType: filters.loadType });
    if (filters.fromCity) query.andWhere('load.fromCity ILIKE :fromCity', { fromCity: `%${filters.fromCity}%` });
    if (filters.toCity) query.andWhere('load.toCity ILIKE :toCity', { toCity: `%${filters.toCity}%` });
    if (filters.vehicleType) query.andWhere('load.vehicleType = :vehicleType', { vehicleType: filters.vehicleType });
    if (filters.trailerType) query.andWhere('load.trailerType = :trailerType', { trailerType: filters.trailerType });
    if (filters.coldChain) query.andWhere('load.coldChain = :coldChain', { coldChain: true });
    if (filters.dateFrom) query.andWhere('load.pickupDate >= :dateFrom', { dateFrom: filters.dateFrom });
    if (filters.dateTo) query.andWhere('load.pickupDate <= :dateTo', { dateTo: filters.dateTo });
    if (filters.escrow) query.andWhere('load.escrow = :escrow', { escrow: true });
    if (filters.minTonnage) query.andWhere('load.totalTonnage >= :minTonnage', { minTonnage: filters.minTonnage });
    if (filters.maxTonnage) query.andWhere('load.totalTonnage <= :maxTonnage', { maxTonnage: filters.maxTonnage });
    if (filters.minVolume) query.andWhere('load.volume >= :minVolume', { minVolume: filters.minVolume });
    if (filters.maxVolume) query.andWhere('load.volume <= :maxVolume', { maxVolume: filters.maxVolume });
    if (filters.minDistance) query.andWhere('load.routeDistance >= :minDistance', { minDistance: filters.minDistance });
    if (filters.maxDistance) query.andWhere('load.routeDistance <= :maxDistance', { maxDistance: filters.maxDistance });

    // Nearby/radius filter — loads within radiusKm of given coordinates
    if (filters.nearbyLatitude != null && filters.nearbyLongitude != null && filters.nearbyRadiusKm) {
      // Fetch all candidate IDs and filter via JS (Haversine) since SQLite lacks PostGIS
      // In production with PostGIS, use: ST_DWithin(location, ST_MakePoint(:lng, :lat), :radiusMeters)
    }

    if (filters.urgent) query.andWhere('load.urgency = :urgent', { urgent: 'Yüksek' });

    // sortBy allowlist — SQL injection önlemi
    const ALLOWED_SORT_COLUMNS = [
      'createdAt', 'updatedAt', 'pickupDate', 'deliveryDate',
      'totalWeight', 'totalTonnage', 'totalKg', 'totalPrice',
      'estimatedDistance', 'title',
    ];

    const sortColumn = filters.sortBy && ALLOWED_SORT_COLUMNS.includes(filters.sortBy)
      ? filters.sortBy
      : 'createdAt';

    query.orderBy(`load.${sortColumn}`, filters.sortOrder === 'ASC' ? 'ASC' : 'DESC');

    const [loads, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      loads,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string) {
    const load = await this.loadRepo.findOne({ where: { id } });
    if (!load) throw new NotFoundException('Yük bulunamadı');
    return load;
  }

  async update(id: string, data: Partial<Load>, userId: string) {
    const load = await this.findById(id);
    if (load.creatorId !== userId) {
      throw new NotFoundException('Bu yükü düzenleme yetkiniz yok');
    }
    await this.loadRepo.update(id, data);
    return this.findById(id);
  }

  /** Get N most recent loads (for homepage) */
  async getRecent(limit: number = 5) {
    return this.loadRepo.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /** Role-based load ranking for homepage */
  async getRanking(userId: string, role: string) {
    const where: any = {};
    if (role === 'yuk_veren' || role === 'SHIPPER') {
      where.creatorId = userId;
    } else if (role === 'tasiyici' || role === 'DRIVER') {
      // Loads assigned to carrier (via receiverId or reservation)
      where.receiverId = userId;
    }
    return this.loadRepo.find({
      where,
      order: {
        status: 'ASC',
        createdAt: 'DESC',
      },
      take: 20,
    });
  }

  /** Check if invoice has been created for a specific load */
  async getInvoiceStatus(loadId: string, userId: string) {
    const load = await this.findById(loadId);
    const isCreator = load.creatorId === userId;
    const isReceiver = load.receiverId === userId;
    const isAssignedCarrier = load.reservedById === userId || isReceiver;
    const isInTransit = load.status === LoadStatus.YOLDA || load.status === LoadStatus.TESLIM_EDILDI;

    // Check if any invoice references this load
    let existingInvoice: any = null;
    if (this.invoiceRepo) {
      existingInvoice = await this.invoiceRepo.findOne({
        where: { createdById: userId },
        order: { createdAt: 'DESC' as any },
      });
    }

    return {
      loadId,
      isCreator,
      isReceiver,
      isAssignedCarrier,
      isInTransit,
      canTrack: (isCreator || isReceiver) && isInTransit,
      canCreateInvoice: isAssignedCarrier && isInTransit && !existingInvoice,
      hasInvoice: !!existingInvoice,
      invoiceId: existingInvoice?.id || null,
    };
  }

  async incrementBidCount(id: string) {
    await this.loadRepo.increment({ id }, 'bidCount', 1);
  }

  /**
   * EX-007: Smart matching engine — Smatch formula
   * Smatch = (w1 × araç/dorse uyumu) + (w2 × mesafe verimliliği) + (w3 × kazanç oranı) − (w4 × boş KM)
   */
  async recommendedLoads(filters: {
    carrierVehicleType?: string;
    carrierTrailerType?: string;
    carrierTonnageCapacity?: number;
    carrierVolumeCapacity?: number;
    currentLatitude?: number;
    currentLongitude?: number;
    maxEmptyKm?: number;
    limit?: number;
  }) {
    const limit = Math.min(filters.limit || 10, 50);
    const maxEmptyKm = filters.maxEmptyKm || 300;

    // Fetch all active loads
    const loads = await this.loadRepo.find({
      where: { status: LoadStatus.BEKLEMEDE },
      order: { createdAt: 'DESC' },
      take: 200,
    });

    // Score each load against carrier profile
    const scored = loads.map((load) => {
      const w1 = 0.35; // vehicle/dorse match
      const w2 = 0.25; // distance efficiency
      const w3 = 0.25; // earnings ratio
      const w4 = 0.15; // empty km penalty

      // 1. Vehicle/trailer match
      let vehicleMatch = 0.5; // neutral default
      if (filters.carrierVehicleType && load.vehicleType) {
        const cv = filters.carrierVehicleType.toLocaleLowerCase('tr-TR');
        const lv = load.vehicleType.toLocaleLowerCase('tr-TR');
        if (cv === lv || lv.includes(cv) || cv.includes(lv)) {
          vehicleMatch = 1.0;
        } else {
          vehicleMatch = 0.2;
        }
      }
      if (filters.carrierTrailerType && load.trailerType) {
        const ct = filters.carrierTrailerType.toLocaleLowerCase('tr-TR');
        const lt = load.trailerType.toLocaleLowerCase('tr-TR');
        if (ct === lt || lt.includes(ct) || ct.includes(lt)) {
          vehicleMatch = (vehicleMatch + 1.0) / 2;
        } else {
          vehicleMatch = (vehicleMatch + 0.2) / 2;
        }
      }

      // 2. Distance efficiency: how close is carrier to pickup?
      let distanceEff = 0.5;
      let emptyKm = 0;
      if (filters.currentLatitude && filters.currentLongitude && load.pickupLatitude && load.pickupLongitude) {
        emptyKm = calculateDistance(
          filters.currentLatitude, filters.currentLongitude,
          load.pickupLatitude, load.pickupLongitude,
        );
        // Closer = higher score (1.0 at 0km, 0.0 at maxEmptyKm)
        distanceEff = Math.max(0, Math.min(1, 1 - (emptyKm / maxEmptyKm)));
      }

      // 3. Earnings ratio: load price vs expected market
      let earningsRatio = 0.5;
      const price = load.totalPrice || (load as any).totalTonnage && (load as any).pricePerTon
        ? (load as any).totalTonnage * (load as any).pricePerTon
        : 0;
      if (price > 0 && emptyKm > 0) {
        const effectiveRate = price / Math.max(emptyKm + (load.routeDistance || 300), 1);
        const avgRate = 45; // ~45 TL/km industry average
        earningsRatio = Math.min(1, effectiveRate / avgRate);
      }

      // 4. Empty KM penalty
      const emptyKmPenalty = Math.min(1, emptyKm / maxEmptyKm);

      // Tonnage/volume compatibility adjustment
      let tonnageOk = true;
      if (filters.carrierTonnageCapacity && (load as any).totalTonnage) {
        tonnageOk = filters.carrierTonnageCapacity >= (load as any).totalTonnage;
      }
      let volumeOk = true;
      if (filters.carrierVolumeCapacity && load.volume) {
        volumeOk = filters.carrierVolumeCapacity >= load.volume;
      }

      // Compute final match score (0-100%)
      let matchScore = (w1 * vehicleMatch + w2 * distanceEff + w3 * earningsRatio - w4 * emptyKmPenalty) * 100;
      matchScore = Math.max(0, Math.min(100, Math.round(matchScore)));

      // Penalty for capacity mismatch
      if (!tonnageOk) matchScore = Math.round(matchScore * 0.6);
      if (!volumeOk) matchScore = Math.round(matchScore * 0.7);

      return {
        load: {
          id: load.id,
          loadNo: load.loadNo,
          title: load.title,
          loadType: load.loadType,
          fromCity: load.fromCity,
          fromDistrict: load.fromDistrict,
          toCity: load.toCity,
          toDistrict: load.toDistrict,
          pickupDate: load.pickupDate,
          deliveryDate: load.deliveryDate,
          pickupLatitude: load.pickupLatitude,
          pickupLongitude: load.pickupLongitude,
          vehicleType: load.vehicleType,
          trailerType: load.trailerType,
          totalTonnage: load.totalTonnage,
          volume: load.volume,
          totalWeight: load.totalWeight,
          coldChain: load.coldChain,
          urgency: load.urgency,
          totalPrice: load.totalPrice,
          escrow: load.escrow,
          bidCount: load.bidCount,
          routeDistance: load.routeDistance,
          createdAt: load.createdAt,
        },
        matchScore,
        matchBreakdown: {
          vehicleMatch: Math.round(vehicleMatch * 100),
          distanceEff: Math.round(distanceEff * 100),
          earningsRatio: Math.round(earningsRatio * 100),
          emptyKm: Math.round(emptyKm),
          emptyKmPenalty: Math.round(emptyKmPenalty * 100),
        },
      };
    });

    // Sort by match score descending, filter minimum 30% match
    const filtered = scored
      .filter(s => s.matchScore >= 20)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);

    return {
      recommendations: filtered,
      total: filtered.length,
      carrierProfile: {
        vehicleType: filters.carrierVehicleType,
        trailerType: filters.carrierTrailerType,
        tonnageCapacity: filters.carrierTonnageCapacity,
        volumeCapacity: filters.carrierVolumeCapacity,
      },
    };
  }

  async getLoadsByCreator(creatorId: string) {
    return this.loadRepo.find({
      where: { creatorId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * UX-001: Instant Book — "Hemen Al" ile anında yük kapma.
   * Sabit fiyatli (isAuction=false) ve BEKLEMEDE durumundaki yükler
   * tasiyici tarafindan dogrudan rezerve edilebilir.
   */
  async instantBook(loadId: string, carrierId: string) {
    const load = await this.findById(loadId);

    if (load.status !== LoadStatus.BEKLEMEDE) {
      throw new BadRequestException('Bu yük artık müsait değil.');
    }

    if (load.isAuction) {
      throw new BadRequestException('Bu yük açık artırma usulü ilan edilmiş. "Hemen Al" sadece sabit fiyatlı yükler için geçerlidir.');
    }

    if (load.creatorId === carrierId) {
      throw new BadRequestException('Kendi yükünüzü alamazsınız.');
    }

    // Optimistic concurrency: reserve the load atomically
    const now = new Date();
    const reservationDurationMs = 30 * 60 * 1000; // 30 dakika rezervasyon süresi
    const reservationExpires = new Date(now.getTime() + reservationDurationMs);

    const updateResult = await this.loadRepo
      .createQueryBuilder()
      .update(Load)
      .set({
        reservedById: carrierId,
        reservedAt: now,
        reservationExpiresAt: reservationExpires,
        receiverId: carrierId,
        status: LoadStatus.YOLDA,
        version: () => 'version + 1',
      })
      .where('id = :id', { id: loadId })
      .andWhere('status = :status', { status: LoadStatus.BEKLEMEDE })
      .andWhere('(reservedById IS NULL OR reservationExpiresAt < :now)', { now })
      .execute();

    if (!updateResult.affected || updateResult.affected === 0) {
      throw new BadRequestException('Bu yük başka bir taşıyıcı tarafından alındı. Lütfen yük listesini yenileyin.');
    }

    // Fetch the updated load
    const updatedLoad = await this.findById(loadId);

    // Auto-create escrow transaction if escrow enabled
    let escrowTx = null;
    if (load.escrow && load.totalPrice && load.totalPrice > 0 && this.escrowRepo) {
      try {
        escrowTx = this.escrowRepo.create({
          loadId: load.id,
          shipperId: load.creatorId,
          carrierId,
          amount: load.totalPrice,
          status: 'BLOKEDE',
          idempotencyKey: `instant-book-${loadId}-${carrierId}`,
        });
        await this.escrowRepo.save(escrowTx);
      } catch (e) {
        this.eventEmitter.emit('escrow.creation_failed', { loadId, carrierId, error: (e as Error).message });
      }
    }

    // Emit events
    this.eventEmitter.emit('load.instant_booked', {
      loadId: updatedLoad.id,
      loadNo: updatedLoad.loadNo,
      carrierId,
      shipperId: updatedLoad.creatorId,
      amount: updatedLoad.totalPrice,
      escrowTxId: escrowTx?.id || null,
      bookedAt: now,
    });

    return {
      success: true,
      load: {
        id: updatedLoad.id,
        loadNo: updatedLoad.loadNo,
        title: updatedLoad.title,
        fromCity: updatedLoad.fromCity,
        toCity: updatedLoad.toCity,
        status: updatedLoad.status,
      },
      reservationExpiresAt: reservationExpires,
      escrow: escrowTx ? {
        id: escrowTx.id,
        amount: escrowTx.amount,
        status: escrowTx.status,
      } : null,
      message: 'Yük başarıyla alındı! 30 dakika içinde işlemi onaylamazsanız rezervasyonunuz iptal edilir.',
    };
  }
}
