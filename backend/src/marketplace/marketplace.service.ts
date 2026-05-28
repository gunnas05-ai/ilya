import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { Listing, ListingStatus } from './listing.entity';
import { ListingCategory } from './listing-category.entity';
import { VehicleDetail, VehicleType } from './vehicle-detail.entity';
import { ListingOffer, OfferStatus } from './listing-offer.entity';
import { calculateDistance } from '../common/distance';

@Injectable()
export class MarketplaceService {
  constructor(
    @InjectRepository(Listing)
    private listingRepo: Repository<Listing>,
    @InjectRepository(ListingCategory)
    private catRepo: Repository<ListingCategory>,
    @InjectRepository(VehicleDetail)
    private vehicleRepo: Repository<VehicleDetail>,
    @InjectRepository(ListingOffer)
    private offerRepo: Repository<ListingOffer>,
  ) {}

  // ── Categories ─────────────────────────────────────────

  async getCategories() {
    return this.catRepo.find({ order: { sortOrder: 'ASC' } });
  }

  // ── Listings CRUD ──────────────────────────────────────

  async createListing(data: {
    title: string; categoryId: number; sellerId: string; price: number;
    description: string; fullAddress: string; city: string; district: string;
    latitude?: number; longitude?: number; isNegotiable?: boolean;
    isBarterAvailable?: boolean; coverImageUrl?: string; imageUrls?: string[];
    attributes?: Record<string, string>;
    vehicleDetail?: Partial<VehicleDetail>;
  }) {
    // AI risk score calculation
    const riskScore = this.calculateAiRiskScore(data);

    const listing = this.listingRepo.create({
      ...data,
      aiRiskScore: riskScore,
      status: riskScore > 0.70 ? ListingStatus.PENDING : ListingStatus.ACTIVE,
    });
    const saved = await this.listingRepo.save(listing);

    // Create vehicle detail if provided
    if (data.vehicleDetail) {
      const vd = this.vehicleRepo.create({
        listingId: saved.id,
        ...data.vehicleDetail,
      });
      await this.vehicleRepo.save(vd);
    }

    return this.findById(saved.id);
  }

  async findAll(filters: {
    categoryId?: number; city?: string; search?: string;
    minPrice?: number; maxPrice?: number; vehicleType?: VehicleType;
    sortBy?: string; sortOrder?: 'ASC' | 'DESC';
    page?: number; limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const qb = this.listingRepo.createQueryBuilder('l')
      .where('l.status = :status', { status: ListingStatus.ACTIVE })
      .andWhere('l.isDeleted = false');

    if (filters.categoryId) qb.andWhere('l.categoryId = :cid', { cid: filters.categoryId });
    if (filters.city) qb.andWhere('l.city ILIKE :city', { city: `%${filters.city}%` });
    if (filters.search) {
      qb.andWhere(new Brackets(qb1 => {
        qb1.where('l.title ILIKE :q', { q: `%${filters.search}%` })
           .orWhere('l.description ILIKE :q', { q: `%${filters.search}%` });
      }));
    }
    if (filters.minPrice) qb.andWhere('l.price >= :min', { min: filters.minPrice });
    if (filters.maxPrice) qb.andWhere('l.price <= :max', { max: filters.maxPrice });

    if (filters.vehicleType) {
      qb.innerJoin('marketplace_vehicle_details', 'vd', 'vd.listingId = l.id')
        .andWhere('vd.vehicleType = :vt', { vt: filters.vehicleType });
    }

    qb.orderBy(filters.sortBy ? `l.${filters.sortBy}` : 'l.createdAt', filters.sortOrder || 'DESC');

    const [listings, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();

    return { listings, total, page, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string) {
    const listing = await this.listingRepo.findOne({ where: { id } });
    if (!listing) throw new NotFoundException('İlan bulunamadı');

    // Increment view count
    listing.viewCount++;
    await this.listingRepo.save(listing);

    // Get vehicle detail
    const vehicle = await this.vehicleRepo.findOne({ where: { listingId: id } });

    return { ...listing, vehicleDetail: vehicle || null };
  }

  async updateListing(id: string, sellerId: string, data: Partial<Listing>) {
    const listing = await this.listingRepo.findOne({ where: { id, sellerId } });
    if (!listing) throw new NotFoundException('İlan bulunamadı veya yetkiniz yok');

    await this.listingRepo.update(id, data);
    return this.findById(id);
  }

  async deleteListing(id: string, sellerId: string) {
    await this.listingRepo.update({ id, sellerId }, { isDeleted: true, status: ListingStatus.DELETED });
    return { success: true };
  }

  // ── EX-013: Towing Uyumluluk Analiz Motoru ────────────

  /**
   * Çekici ve dorse arasında mekanik uyumluluk analizi yapar.
   * Kontroller: king pin çapı, aks kapasitesi, ADR uyumu, uzunluk limiti.
   */
  async checkTowingCompatibility(tractorListingId: string, trailerListingId: string) {
    const tractor = await this.vehicleRepo.findOne({ where: { listingId: tractorListingId } });
    const trailer = await this.vehicleRepo.findOne({ where: { listingId: trailerListingId } });

    if (!tractor || !trailer) throw new NotFoundException('Araç detayı bulunamadı');
    if (tractor.vehicleType !== VehicleType.CEKICI && tractor.vehicleType !== VehicleType.TIR) {
      throw new BadRequestException('Birinci araç çekici/TIR olmalıdır');
    }
    if (trailer.vehicleType !== VehicleType.DORSE) {
      throw new BadRequestException('İkinci araç dorse olmalıdır');
    }

    const checks: Array<{ name: string; compatible: boolean; detail: string }> = [];

    // 1. King pin çapı uyumu (2" veya 3.5")
    if (tractor.kingPinDiameter && trailer.kingPinDiameter) {
      const match = Math.abs(tractor.kingPinDiameter - trailer.kingPinDiameter) < 0.1;
      checks.push({
        name: 'King Pin Çap Uyumu',
        compatible: match,
        detail: match
          ? `Uyumlu: Çekici ${tractor.kingPinDiameter}" ↔ Dorse ${trailer.kingPinDiameter}"`
          : `UYUMSUZ: Çekici ${tractor.kingPinDiameter}" ≠ Dorse ${trailer.kingPinDiameter}"`,
      });
    }

    // 2. Aks kapasitesi
    if (tractor.axleCapacityKg && trailer.totalWeightKg) {
      const ok = tractor.axleCapacityKg >= trailer.totalWeightKg;
      checks.push({
        name: 'Aks Kapasitesi',
        compatible: ok,
        detail: ok
          ? `Uyumlu: Çekici ${(tractor.axleCapacityKg / 1000).toFixed(1)}t ≥ Dorse ${(trailer.totalWeightKg / 1000).toFixed(1)}t`
          : `AŞIM: Çekici ${(tractor.axleCapacityKg / 1000).toFixed(1)}t < Dorse ${(trailer.totalWeightKg / 1000).toFixed(1)}t`,
      });
    }

    // 3. ADR tehlikeli madde uyumu
    if (tractor.adrClass || trailer.adrClass) {
      const adrMatch = tractor.adrClass === trailer.adrClass;
      checks.push({
        name: 'ADR Sınıf Uyumu',
        compatible: adrMatch,
        detail: adrMatch
          ? `Uyumlu: Her iki araç ADR ${tractor.adrClass}`
          : `UYUMSUZ: Çekici ADR ${tractor.adrClass || 'yok'} ≠ Dorse ADR ${trailer.adrClass || 'yok'}`,
      });
    }

    // 4. Dorse uzunluk/kurtarma açısı
    if (trailer.trailerLengthCm && trailer.trailerLengthCm > 1650) {
      checks.push({
        name: 'Dorse Uzunluk Limiti',
        compatible: true,
        detail: `Dorse ${trailer.trailerLengthCm}cm — standart TIR uzunluğunu aşıyor, kurtarma açısına dikkat edin.`,
      });
    }

    const allCompatible = checks.every(c => c.compatible);

    return {
      compatible: allCompatible,
      checks,
      tractor: { listingId: tractorListingId, vehicleType: tractor.vehicleType, brand: tractor.brand, model: tractor.model },
      trailer: { listingId: trailerListingId, vehicleType: trailer.vehicleType, brand: trailer.brand, model: trailer.model },
      recommendation: allCompatible
        ? '✅ Bu çekici ve dorse tam uyumludur.'
        : '⚠️ Mekanik uyumsuzluk tespit edildi. Yukarıdaki detayları inceleyin.',
    };
  }

  // ── Offers & Negotiations ──────────────────────────────

  async createOffer(data: { listingId: string; buyerId: string; offerAmount: number; message?: string; isBarterOffer?: boolean; barterItems?: any[] }) {
    const offer = this.offerRepo.create({
      ...data,
      status: OfferStatus.PENDING,
      expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h expiry
    });
    return this.offerRepo.save(offer);
  }

  async getOffersForListing(listingId: string, userId: string) {
    const listing = await this.listingRepo.findOne({ where: { id: listingId, sellerId: userId } });
    if (!listing) throw new NotFoundException('İlan bulunamadı veya yetkiniz yok');
    return this.offerRepo.find({ where: { listingId }, order: { createdAt: 'DESC' } });
  }

  async getMyOffers(buyerId: string) {
    return this.offerRepo.find({ where: { buyerId }, order: { createdAt: 'DESC' } });
  }

  async acceptOffer(offerId: string, userId: string) {
    const offer = await this.offerRepo.findOne({ where: { id: offerId } });
    if (!offer) throw new NotFoundException('Teklif bulunamadı');

    const listing = await this.listingRepo.findOne({ where: { id: offer.listingId, sellerId: userId } });
    if (!listing) throw new NotFoundException('Yetkiniz yok');

    offer.status = OfferStatus.ACCEPTED;
    offer.acceptedAt = new Date();
    await this.offerRepo.save(offer);

    // Update listing status
    listing.status = ListingStatus.RESERVED;
    await this.listingRepo.save(listing);

    return offer;
  }

  async rejectOffer(offerId: string, userId: string) {
    const listing = await this.listingRepo.findOne({ where: { id: (await this.offerRepo.findOne({ where: { id: offerId } }))?.listingId, sellerId: userId } });
    if (!listing) throw new NotFoundException('Yetkiniz yok');

    await this.offerRepo.update(offerId, { status: OfferStatus.REJECTED });
    return { success: true };
  }

  async counterOffer(offerId: string, userId: string, counterAmount: number, counterMessage?: string) {
    const listing = await this.listingRepo.findOne({ where: { id: (await this.offerRepo.findOne({ where: { id: offerId } }))?.listingId, sellerId: userId } });
    if (!listing) throw new NotFoundException('Yetkiniz yok');

    await this.offerRepo.update(offerId, {
      status: OfferStatus.COUNTERED,
      counterAmount,
      counterMessage,
      counteredAt: new Date(),
    });
    return this.offerRepo.findOne({ where: { id: offerId } });
  }

  // ── EX-013: AI Risk Score ─────────────────────────────

  private calculateAiRiskScore(data: any): number {
    let score = 0;
    // Price anomaly: very low or very high
    if (data.price < 10000) score += 0.3;
    else if (data.price > 2000000) score += 0.2;

    // Missing critical fields
    if (!data.description || data.description.length < 20) score += 0.2;
    if (!data.imageUrls || data.imageUrls.length === 0) score += 0.15;
    if (!data.latitude || !data.longitude) score += 0.1;
    if (data.isBarterAvailable) score += 0.05; // Barter slightly riskier

    return Math.min(1.0, Math.round(score * 100) / 100);
  }
}
