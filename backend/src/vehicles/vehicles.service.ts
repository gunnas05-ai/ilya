import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThanOrEqual, LessThanOrEqual, Between, Not, IsNull } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { Vehicle, VehiclePhoto, VehicleStatus } from './vehicle.entity';
import { VehicleCategory } from './category.entity';
import { VehicleListing, VehicleBid, SaleType, ListingStatus } from './listing.entity';
import { Notification, NotificationType } from '../notifications/notification.entity';

// Admin escrow flag (in-memory, would be DB-driven in production)
let escrowEnabled = false;

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle) private vehicleRepo: Repository<Vehicle>,
    @InjectRepository(VehiclePhoto) private photoRepo: Repository<VehiclePhoto>,
    @InjectRepository(VehicleCategory) private catRepo: Repository<VehicleCategory>,
    @InjectRepository(VehicleListing) private listingRepo: Repository<VehicleListing>,
    @InjectRepository(VehicleBid) private bidRepo: Repository<VehicleBid>,
    @InjectRepository(Notification) private notifRepo: Repository<Notification>,
  ) {}

  // ── Vehicle CRUD ──────────────────────────────────────

  async getMyVehicles(userId: string) {
    return this.vehicleRepo.find({ where: { userId }, relations: ['photos'], order: { createdAt: 'DESC' } });
  }

  async getVehicle(id: string, userId: string) {
    const v = await this.vehicleRepo.findOne({ where: { id }, relations: ['photos'] });
    if (!v) throw new NotFoundException('Araç bulunamadı');
    // Strip plate for non-owners
    if (v.userId !== userId) v.plate = '***';
    return v;
  }

  async createVehicle(userId: string, data: any) {
    const v = this.vehicleRepo.create({ ...data, userId, status: VehicleStatus.DRAFTED });
    const saved: Vehicle = await this.vehicleRepo.save(v as any);
    // Build category tree
    if (saved.brand && saved.model) await this.ensureCategory(saved.brand, saved.model, saved.year);
    return saved;
  }

  async updateVehicle(id: string, userId: string, data: any) {
    const v = await this.vehicleRepo.findOne({ where: { id } });
    if (!v) throw new NotFoundException('Araç bulunamadı');
    if (v.userId !== userId) throw new ForbiddenException('Bu aracı düzenleme yetkiniz yok');
    await this.vehicleRepo.update(id, data);
    const updated = await this.vehicleRepo.findOne({ where: { id }, relations: ['photos'] });
    if (!updated) throw new NotFoundException('Araç güncelleme sonrası bulunamadı');
    if (data.brand || data.model) await this.ensureCategory(updated.brand, updated.model, updated.year);
    return updated;
  }

  async deleteVehicle(id: string, userId: string) {
    const v = await this.vehicleRepo.findOne({ where: { id } });
    if (!v) throw new NotFoundException('Araç bulunamadı');
    if (v.userId !== userId) throw new ForbiddenException('Bu aracı silme yetkiniz yok');
    await this.vehicleRepo.remove(v);
    return { deleted: true };
  }

  async uploadPhoto(vehicleId: string, userId: string, url: string) {
    const v = await this.vehicleRepo.findOne({ where: { id: vehicleId }, relations: ['photos'] });
    if (!v) throw new NotFoundException('Araç bulunamadı');
    if (v.userId !== userId) throw new ForbiddenException('Bu araca fotoğraf ekleme yetkiniz yok');
    if ((v.photos || []).length >= 5) throw new BadRequestException('En fazla 5 fotoğraf yükleyebilirsiniz');
    const count = (v.photos || []).length;
    const photo = this.photoRepo.create({ vehicleId, url, sortOrder: count });
    return this.photoRepo.save(photo);
  }

  async deletePhoto(photoId: string, userId: string) {
    const photo = await this.photoRepo.findOne({ where: { id: photoId }, relations: ['vehicle'] });
    if (!photo) throw new NotFoundException('Fotoğraf bulunamadı');
    if (photo.vehicle.userId !== userId) throw new ForbiddenException('Bu fotoğrafı silme yetkiniz yok');
    await this.photoRepo.remove(photo);
    return { deleted: true };
  }

  // ── Sales criteria check ──────────────────────────────

  async checkSaleCriteria(vehicleId: string, userId: string) {
    const v = await this.vehicleRepo.findOne({ where: { id: vehicleId }, relations: ['photos'] });
    if (!v) throw new NotFoundException('Araç bulunamadı');
    if (v.userId !== userId) throw new ForbiddenException('Bu aracı satışa çıkarma yetkiniz yok');

    const missing: string[] = [];
    if (!v.photos || v.photos.length < 3) missing.push('En az 3 fotoğraf yüklenmeli');
    if (!v.description || v.description.length < 50) missing.push('Açıklama en az 50 karakter olmalı');
    if (!v.brand) missing.push('Marka');
    if (!v.model) missing.push('Model');
    if (!v.year) missing.push('Yıl');
    if (!v.mileage) missing.push('Kilometre');
    if (!v.fuelType) missing.push('Yakıt Tipi');
    if (!v.transmission) missing.push('Şanzıman');
    if (!v.color) missing.push('Renk');
    if (!v.plate) missing.push('Plaka');
    if (v.hasAccident === null || v.hasAccident === undefined) missing.push('Kaza Gecmisi (secim yapilmali)');
    if (v.hasServiceRecord === null || v.hasServiceRecord === undefined) missing.push('Servis Kayitlari (secim yapilmali)');

    return { passed: missing.length === 0, missing };
  }

  // ── Category tree ─────────────────────────────────────

  /** 3-level category tree: Brand → Model → Year */
  async ensureCategory(brand: string, model: string, year?: number) {
    // Level 1: Brand
    let brandCat = await this.catRepo.findOne({ where: { name: brand, type: 'brand', parentId: IsNull() as any } });
    if (!brandCat) {
      brandCat = this.catRepo.create({ name: brand, slug: brand.toLowerCase().replace(/\s+/g, '-'), type: 'brand' });
      brandCat = await this.catRepo.save(brandCat);
    }

    // Level 2: Model
    let modelCat = await this.catRepo.findOne({ where: { name: model, type: 'model', parentId: brandCat.id } });
    if (!modelCat) {
      const modelSlug = `${brandCat.slug}/${model.toLowerCase().replace(/\s+/g, '-')}`;
      modelCat = this.catRepo.create({ name: model, slug: modelSlug, type: 'model', parentId: brandCat.id });
      modelCat = await this.catRepo.save(modelCat);
    }

    // Level 3: Year (only if provided)
    if (year) {
      const yearStr = year.toString();
      let yearCat = await this.catRepo.findOne({ where: { name: yearStr, type: 'year', parentId: modelCat.id } });
      if (!yearCat) {
        const yearSlug = `${modelCat.slug}/${yearStr}`;
        yearCat = this.catRepo.create({ name: yearStr, slug: yearSlug, type: 'year', parentId: modelCat.id });
        yearCat = await this.catRepo.save(yearCat);
      }
      await this.vehicleRepo.update(
        { brand, model, categoryId: IsNull() as any },
        { categoryId: yearCat.id },
      );
      return yearCat;
    }

    // Link vehicle to model category
    await this.vehicleRepo.update(
      { brand, model, categoryId: IsNull() as any },
      { categoryId: modelCat.id },
    );
    return modelCat;
  }

  async getCategories() {
    const brands = await this.catRepo.find({ where: { type: 'brand', parentId: IsNull() as any }, order: { name: 'ASC' } });
    return brands;
  }

  async getCategoryBySlug(slug: string) {
    const cat = await this.catRepo.findOne({ where: { slug }, relations: ['children'] });
    if (!cat) throw new NotFoundException('Kategori bulunamadı');
    return cat;
  }

  async getCategoryListings(slug: string, filters?: any) {
    const cat = await this.getCategoryBySlug(slug);
    const categoryIds = [cat.id, ...(cat.children || []).map(c => c.id)];

    const qb = this.listingRepo.createQueryBuilder('l')
      .leftJoinAndSelect('l.vehicle', 'v')
      .leftJoinAndSelect('v.photos', 'p')
      .where('v.categoryId IN (:...ids)', { ids: categoryIds })
      .andWhere('l.status = :status', { status: ListingStatus.ACTIVE });

    if (filters?.minYear) qb.andWhere('v.year >= :minYear', { minYear: filters.minYear });
    if (filters?.maxYear) qb.andWhere('v.year <= :maxYear', { maxYear: filters.maxYear });
    if (filters?.minPrice) qb.andWhere('l.price >= :minPrice', { minPrice: filters.minPrice });
    if (filters?.maxPrice) qb.andWhere('l.price <= :maxPrice', { maxPrice: filters.maxPrice });
    if (filters?.fuelType) qb.andWhere('v.fuelType = :fuelType', { fuelType: filters.fuelType });

    return qb.orderBy('l.createdAt', 'DESC').take(50).getMany();
  }

  // ── Listings ──────────────────────────────────────────

  async createListing(userId: string, data: any) {
    // Check criteria first
    const criteria = await this.checkSaleCriteria(data.vehicleId, userId);
    if (!criteria.passed) {
      throw new BadRequestException({ message: 'Satış kriterleri karşılanmıyor', missing: criteria.missing });
    }

    // Check no active listing already
    const existing = await this.listingRepo.findOne({
      where: { vehicleId: data.vehicleId, status: ListingStatus.ACTIVE },
    });
    if (existing) throw new BadRequestException('Bu araç zaten aktif bir satışta');

    const listing = this.listingRepo.create({
      vehicleId: data.vehicleId,
      sellerId: userId,
      saleType: data.saleType,
      price: data.price || null,
      startingBid: data.startingBid || null,
      reservePrice: data.reservePrice || null,
      buyNowPrice: data.buyNowPrice || null,
      bidIncrement: data.bidIncrement || 1000,
      auctionStart: data.auctionStart || new Date(),
      auctionEnd: data.auctionEnd || null,
      status: ListingStatus.ACTIVE,
    });
    return this.listingRepo.save(listing);
  }

  async getListings(filters?: any) {
    const qb = this.listingRepo.createQueryBuilder('l')
      .leftJoinAndSelect('l.vehicle', 'v')
      .leftJoinAndSelect('v.photos', 'p')
      .leftJoinAndSelect('l.seller', 's')
      .where('l.status = :status', { status: ListingStatus.ACTIVE });

    if (filters?.brand) qb.andWhere('v.brand = :brand', { brand: filters.brand });
    if (filters?.model) qb.andWhere('v.model = :model', { model: filters.model });
    if (filters?.minYear) qb.andWhere('v.year >= :minYear', { minYear: filters.minYear });
    if (filters?.maxYear) qb.andWhere('v.year <= :maxYear', { maxYear: filters.maxYear });
    if (filters?.minMileage) qb.andWhere('v.mileage >= :minMileage', { minMileage: filters.minMileage });
    if (filters?.maxMileage) qb.andWhere('v.mileage <= :maxMileage', { maxMileage: filters.maxMileage });
    if (filters?.minPrice) qb.andWhere('(l.price >= :minPrice OR l.startingBid >= :minPrice)', { minPrice: filters.minPrice });
    if (filters?.maxPrice) qb.andWhere('(l.price <= :maxPrice OR l.buyNowPrice <= :maxPrice)', { maxPrice: filters.maxPrice });
    if (filters?.fuelType) qb.andWhere('v.fuelType = :fuelType', { fuelType: filters.fuelType });
    if (filters?.transmission) qb.andWhere('v.transmission = :transmission', { transmission: filters.transmission });
    if (filters?.saleType) qb.andWhere('l.saleType = :saleType', { saleType: filters.saleType });

    return qb.orderBy('l.createdAt', 'DESC').take(50).getMany();
  }

  async getListing(id: string) {
    const listing = await this.listingRepo.findOne({
      where: { id },
      relations: ['vehicle', 'vehicle.photos', 'seller', 'bids', 'bids.bidder'],
      order: { bids: { amount: 'DESC' } },
    });
    if (!listing) throw new NotFoundException('İlan bulunamadı');
    // Hide plate from non-seller
    if (listing.vehicle) listing.vehicle.plate = '***';
    return listing;
  }

  // ── Bids & Buying ─────────────────────────────────────

  async placeBid(listingId: string, userId: string, amount: number) {
    const listing = await this.listingRepo.findOne({ where: { id: listingId }, relations: ['bids', 'vehicle', 'seller'] });
    if (!listing) throw new NotFoundException('İlan bulunamadı');
    if (listing.status !== ListingStatus.ACTIVE) throw new BadRequestException('İlan aktif değil');
    if (listing.saleType !== SaleType.AUCTION) throw new BadRequestException('Bu ilan açık artırma usulü değil');
    if (listing.sellerId === userId) throw new BadRequestException('Kendi ilanınıza teklif veremezsiniz');

    const highestBid = listing.bids?.[0]?.amount || listing.startingBid || 0;
    const minRequired = highestBid + (listing.bidIncrement || 1000);
    if (amount < minRequired) throw new BadRequestException(`Teklif en az ${minRequired.toLocaleString('tr-TR')} TL olmalıdır`);

    const bid = this.bidRepo.create({ listingId, userId, amount });
    const saved = await this.bidRepo.save(bid);

    // Notify seller
    await this.notifRepo.save(this.notifRepo.create({
      userId: listing.sellerId,
      type: NotificationType.NEW_LOAD_MATCH as any,
      title: 'Yeni Teklif',
      message: `${listing.vehicle?.brand || ''} ${listing.vehicle?.model || ''} aracınıza ${amount.toLocaleString('tr-TR')} TL teklif verildi.`,
    }));

    // Outbid notification
    const prevBidder = listing.bids?.[0]?.userId;
    if (prevBidder && prevBidder !== userId) {
      await this.notifRepo.save(this.notifRepo.create({
        userId: prevBidder,
        type: NotificationType.NEW_LOAD_MATCH as any,
        title: 'Daha Yüksek Teklif',
        message: 'Verdiğiniz teklif geçildi. Daha yüksek bir teklif verildi.',
      }));
    }

    return saved;
  }

  async buyNow(listingId: string, userId: string) {
    const listing = await this.listingRepo.findOne({ where: { id: listingId }, relations: ['vehicle', 'seller'] });
    if (!listing) throw new NotFoundException('İlan bulunamadı');
    if (listing.status !== ListingStatus.ACTIVE) throw new BadRequestException('İlan aktif değil');
    if (listing.sellerId === userId) throw new BadRequestException('Kendi ilanınızı satın alamazsınız');

    const price = listing.saleType === SaleType.FIXED ? listing.price : listing.buyNowPrice;
    if (!price) throw new BadRequestException('Bu ilan için hemen al fiyatı belirlenmemiş');

    listing.status = ListingStatus.SOLD;
    await this.listingRepo.save(listing);

    // Update vehicle
    await this.vehicleRepo.update(listing.vehicleId, { status: VehicleStatus.SOLD });

    // Notify seller
    await this.notifRepo.save(this.notifRepo.create({
      userId: listing.sellerId,
      type: NotificationType.NEW_LOAD_MATCH as any,
      title: 'Aracınız Satıldı!',
      message: `${listing.vehicle?.brand || ''} ${listing.vehicle?.model || ''} aracınız ${price.toLocaleString('tr-TR')} TL'ye satıldı.`,
    }));

    return { success: true, listingId, price, escrowAvailable: escrowEnabled };
  }

  // ── Cron: end expired auctions ─────────────────────────

  @Cron('*/30 * * * * *')
  async endExpiredAuctions() {
    const expired = await this.listingRepo.find({
      where: { status: ListingStatus.ACTIVE, saleType: SaleType.AUCTION, auctionEnd: LessThanOrEqual(new Date()) },
      relations: ['bids', 'vehicle', 'seller'],
    });

    for (const listing of expired) {
      const highestBid = listing.bids?.[0];
      const meetsReserve = !listing.reservePrice || (highestBid && highestBid.amount >= listing.reservePrice);

      if (highestBid && meetsReserve) {
        listing.status = ListingStatus.SOLD;
        await this.vehicleRepo.update(listing.vehicleId, { status: VehicleStatus.SOLD });
        await this.notifRepo.save(this.notifRepo.create({
          userId: listing.sellerId,
          type: NotificationType.NEW_LOAD_MATCH as any,
          title: 'İhale Sonuçlandı — Satıldı',
          message: `${listing.vehicle?.brand} ${listing.vehicle?.model} ${highestBid.amount.toLocaleString('tr-TR')} TL'ye satıldı.`,
        }));
        if (highestBid.userId) {
          await this.notifRepo.save(this.notifRepo.create({
            userId: highestBid.userId,
            type: NotificationType.NEW_LOAD_MATCH as any,
            title: 'İhaleyi Kazandınız!',
            message: `${listing.vehicle?.brand} ${listing.vehicle?.model} aracını ${highestBid.amount.toLocaleString('tr-TR')} TL'ye kazandınız.`,
          }));
        }
      } else {
        listing.status = ListingStatus.ENDED_UNSOLD;
        await this.notifRepo.save(this.notifRepo.create({
          userId: listing.sellerId,
          type: NotificationType.NEW_LOAD_MATCH as any,
          title: 'İhale Sonuçlandı — Satılamadı',
          message: `${listing.vehicle?.brand} ${listing.vehicle?.model} ihalesi sonuçlandı ancak rezerv fiyat karşılanmadı.`,
        }));
      }

      await this.listingRepo.save(listing);
    }
  }

  // ── Admin Escrow Toggle ───────────────────────────────

  getEscrowStatus() { return { escrowEnabled }; }
  toggleEscrow() { escrowEnabled = !escrowEnabled; return { escrowEnabled }; }
}
