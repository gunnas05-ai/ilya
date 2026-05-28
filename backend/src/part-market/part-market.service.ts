import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between, In } from 'typeorm';
import { PartListing } from './entities/part-listing.entity';
import { PartCategory, PartPhoto, PartOffer, PartFavorite, PartTransaction, PartReview, PartDispute, PartBoost, PartCommissionConfig } from './entities/part-entities';
import { MessageBusService } from '../common/message-bus.service';

@Injectable()
export class PartMarketService {
  constructor(
    @InjectRepository(PartListing) private listingRepo: Repository<PartListing>,
    @InjectRepository(PartCategory) private catRepo: Repository<PartCategory>,
    @InjectRepository(PartPhoto) private photoRepo: Repository<PartPhoto>,
    @InjectRepository(PartOffer) private offerRepo: Repository<PartOffer>,
    @InjectRepository(PartFavorite) private favRepo: Repository<PartFavorite>,
    @InjectRepository(PartTransaction) private txRepo: Repository<PartTransaction>,
    @InjectRepository(PartReview) private reviewRepo: Repository<PartReview>,
    @InjectRepository(PartDispute) private disputeRepo: Repository<PartDispute>,
    @InjectRepository(PartBoost) private boostRepo: Repository<PartBoost>,
    @InjectRepository(PartCommissionConfig) private commConfigRepo: Repository<PartCommissionConfig>,
    private messageBus: MessageBusService,
  ) {}

  // ── İlan ──
  async createListing(data: Partial<PartListing>, userId: string): Promise<PartListing> {
    const listing = this.listingRepo.create({ ...data, sellerId: userId, status: 'active' });
    const saved = await this.listingRepo.save(listing);
    await this.messageBus.emit('part.listed', { listingId: saved.id, sellerId: userId });
    return saved;
  }

  async getListings(filters: any): Promise<{ items: PartListing[]; total: number }> {
    const qb = this.listingRepo.createQueryBuilder('l').where('l.status = :status', { status: 'active' });
    if (filters.categoryId) qb.andWhere('l.categoryId = :cid', { cid: filters.categoryId });
    if (filters.brand) qb.andWhere('l.brand ILIKE :brand', { brand: `%${filters.brand}%` });
    if (filters.minPrice) qb.andWhere('l.price >= :min', { min: filters.minPrice });
    if (filters.maxPrice) qb.andWhere('l.price <= :max', { max: filters.maxPrice });
    if (filters.city) qb.andWhere('l.city = :city', { city: filters.city });
    if (filters.condition) qb.andWhere('l.condition = :cond', { cond: filters.condition });
    if (filters.partNumber) qb.andWhere('l.partNumber ILIKE :pn', { pn: `%${filters.partNumber}%` });
    if (filters.search) qb.andWhere('(l.title ILIKE :q OR l.description ILIKE :q)', { q: `%${filters.search}%` });
    if (filters.isBoosted) qb.andWhere('l.isBoosted = true').andWhere('l.boostExpiresAt > NOW()');
    if (filters.lat && filters.lng && filters.radius) {
      qb.andWhere(`ST_DWithin(ST_MakePoint(COALESCE(l.longitude,0), COALESCE(l.latitude,0))::geography, ST_MakePoint(:lng, :lat)::geography, :r)`, { lat: filters.lat, lng: filters.lng, r: filters.radius * 1000 });
    }
    qb.orderBy(filters.isBoosted ? 'l.boostExpiresAt' : 'l.createdAt', 'DESC').skip(filters.offset || 0).take(filters.limit || 20);
    if (filters.lat) qb.addOrderBy(`ST_Distance(ST_MakePoint(COALESCE(l.longitude,0), COALESCE(l.latitude,0))::geography, ST_MakePoint(:lng, :lat)::geography)`);
    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async getListing(id: string): Promise<PartListing> {
    const listing = await this.listingRepo.findOne({ where: { id } });
    if (!listing) throw new NotFoundException('İlan bulunamadi');
    listing.viewCount += 1; await this.listingRepo.save(listing);
    return listing;
  }

  async updateListing(id: string, userId: string, data: Partial<PartListing>): Promise<PartListing> {
    const listing = await this.listingRepo.findOne({ where: { id, sellerId: userId } });
    if (!listing) throw new NotFoundException('İlan bulunamadi');
    Object.assign(listing, data);
    return this.listingRepo.save(listing);
  }

  async deleteListing(id: string, userId: string): Promise<void> {
    const listing = await this.listingRepo.findOne({ where: { id, sellerId: userId } });
    if (!listing) throw new NotFoundException('İlan bulunamadi');
    listing.status = 'removed';
    await this.listingRepo.save(listing);
  }

  // ── Kategoriler ──
  async getCategories(parentId?: string): Promise<PartCategory[]> {
    return this.catRepo.find({ where: { parentId: parentId || null as any, isActive: true }, order: { sortOrder: 'ASC' } });
  }

  // ── Teklif ──
  async createOffer(listingId: string, buyerId: string, amount: number, message: string): Promise<PartOffer> {
    const listing = await this.listingRepo.findOne({ where: { id: listingId } });
    if (!listing || listing.status !== 'active') throw new BadRequestException('İlan aktif değil');
    if (!listing.acceptOffer) throw new BadRequestException('Bu ilan teklife kapalı');
    const offer = this.offerRepo.create({ listingId, buyerId, amount, message });
    const saved = await this.offerRepo.save(offer);
    await this.messageBus.emit('part.offer_received', { offerId: saved.id, listingId, sellerId: listing.sellerId, amount });
    return saved;
  }

  async getOffersForListing(listingId: string, userId: string): Promise<PartOffer[]> {
    return this.offerRepo.find({ where: { listingId }, order: { createdAt: 'DESC' } });
  }

  async acceptOffer(offerId: string, userId: string): Promise<PartOffer> {
    const offer = await this.offerRepo.findOne({ where: { id: offerId } });
    if (!offer) throw new NotFoundException('Teklif bulunamadi');
    offer.status = 'accepted';
    return this.offerRepo.save(offer);
  }

  // ── Favori ──
  async toggleFavorite(listingId: string, userId: string): Promise<boolean> {
    const existing = await this.favRepo.findOne({ where: { listingId, userId } });
    if (existing) { await this.favRepo.remove(existing); return false; }
    await this.favRepo.save({ userId, listingId } as any);
    return true;
  }

  async getMyFavorites(userId: string): Promise<PartFavorite[]> {
    return this.favRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  // ── Puanlama ──
  async createReview(data: Partial<PartReview>): Promise<PartReview> {
    if ((data.rating || 0) < 1 || (data.rating || 0) > 5) throw new BadRequestException('Puan 1-5 arasi olmali');
    return this.reviewRepo.save(data as any);
  }

  // ── Anlaşmazlık ──
  async createDispute(data: Partial<PartDispute>): Promise<PartDispute> {
    return this.disputeRepo.save(data as any);
  }

  // ── Ek İşlemler ──
  async renewListing(id: string): Promise<PartListing> {
    const listing = await this.listingRepo.findOne({ where: { id } });
    if (!listing) throw new NotFoundException('İlan bulunamadi');
    listing.updatedAt = new Date();
    return this.listingRepo.save(listing);
  }

  async markAsSold(id: string): Promise<PartListing> {
    const listing = await this.listingRepo.findOne({ where: { id } });
    if (!listing) throw new NotFoundException('İlan bulunamadi');
    listing.status = 'sold';
    return this.listingRepo.save(listing);
  }

  async rejectOffer(offerId: string): Promise<PartOffer> {
    const offer = await this.offerRepo.findOne({ where: { id: offerId } });
    if (!offer) throw new NotFoundException('Teklif bulunamadi');
    offer.status = 'rejected';
    return this.offerRepo.save(offer);
  }

  async counterOffer(offerId: string, amount: number, message: string): Promise<PartOffer> {
    const offer = await this.offerRepo.findOne({ where: { id: offerId } });
    if (!offer) throw new NotFoundException('Teklif bulunamadi');
    offer.status = 'countered'; offer.counterAmount = amount; offer.counterMessage = message;
    return this.offerRepo.save(offer);
  }

  async getMyOffers(userId: string): Promise<PartOffer[]> {
    return this.offerRepo.find({ where: { buyerId: userId }, order: { createdAt: 'DESC' } });
  }

  async createTransaction(listingId: string, buyerId: string): Promise<PartTransaction> {
    const listing = await this.listingRepo.findOne({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('İlan bulunamadi');
    const tx = this.txRepo.create({ listingId, buyerId, sellerId: listing.sellerId, amount: listing.price, shippingAmount: listing.shippingPrice || 0, platformCommission: listing.price * 0.05, status: 'pending_payment' });
    const saved = await this.txRepo.save(tx);
    listing.status = 'reserved'; await this.listingRepo.save(listing);
    await this.messageBus.emit('part.sold', { transactionId: saved.id, listingId, buyerId, sellerId: listing.sellerId, amount: listing.price });
    return saved;
  }

  async confirmDelivery(txId: string): Promise<PartTransaction> {
    const tx = await this.txRepo.findOne({ where: { id: txId } });
    if (!tx) throw new NotFoundException('İşlem bulunamadi');
    tx.status = 'delivered'; tx.buyerConfirmedAt = new Date();
    return this.txRepo.save(tx);
  }

  async getMyListings(userId: string): Promise<PartListing[]> {
    return this.listingRepo.find({ where: { sellerId: userId }, order: { createdAt: 'DESC' } });
  }

  async boostListing(listingId: string, userId: string, plan: string): Promise<PartBoost> {
    const prices: Record<string, number> = { daily: 49, weekly: 199, monthly: 599 };
    const days: Record<string, number> = { daily: 1, weekly: 7, monthly: 30 };
    const price = prices[plan] || 199;
    const boost = this.boostRepo.create({ listingId, userId, plan, price, startsAt: new Date(), endsAt: new Date(Date.now() + (days[plan] || 7) * 86400000), isActive: true });
    const saved = await this.boostRepo.save(boost);
    await this.listingRepo.update(listingId, { isBoosted: true, boostExpiresAt: saved.endsAt });
    return saved;
  }

  async getMyBoosts(userId: string): Promise<PartBoost[]> {
    return this.boostRepo.find({ where: { userId, isActive: true }, order: { createdAt: 'DESC' } });
  }

  async getUserReviews(userId: string): Promise<PartReview[]> {
    return this.reviewRepo.find({ where: { reviewedId: userId }, order: { createdAt: 'DESC' } });
  }

  // ── Admin: Onay ──
  async getPendingListings(): Promise<PartListing[]> {
    return this.listingRepo.find({ where: { status: 'flagged' }, order: { createdAt: 'DESC' } });
  }
}
