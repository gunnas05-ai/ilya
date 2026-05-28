import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThan, In } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { Restaurant, WorkingStatus } from './restaurant.entity';
import { RestaurantImage, RestaurantImageType } from './restaurant-image.entity';
import { Menu } from './menu.entity';
import { MenuItem } from './menu-item.entity';
import { RestaurantReview } from './restaurant-review.entity';
import { ReviewReply } from './review-reply.entity';
import { RestaurantFavorite } from './restaurant-favorite.entity';
import { RestaurantReservation, ReservationStatus, RestaurantTable, RestaurantCapacityConfig } from './reservation.entity';
import { MenuItemReview } from './menu-item-review.entity';
import { calculateDistance } from '../common/distance';

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectRepository(Restaurant) private restaurantRepo: Repository<Restaurant>,
    @InjectRepository(RestaurantImage) private imageRepo: Repository<RestaurantImage>,
    @InjectRepository(Menu) private menuRepo: Repository<Menu>,
    @InjectRepository(MenuItem) private menuItemRepo: Repository<MenuItem>,
    @InjectRepository(RestaurantReview) private reviewRepo: Repository<RestaurantReview>,
    @InjectRepository(ReviewReply) private replyRepo: Repository<ReviewReply>,
    @InjectRepository(RestaurantFavorite) private favoriteRepo: Repository<RestaurantFavorite>,
    @InjectRepository(RestaurantReservation) private reservationRepo: Repository<RestaurantReservation>,
    @InjectRepository(MenuItemReview) private menuItemReviewRepo: Repository<MenuItemReview>,
    @InjectRepository(RestaurantTable) private tableRepo: Repository<RestaurantTable>,
    @InjectRepository(RestaurantCapacityConfig) private capacityConfigRepo: Repository<RestaurantCapacityConfig>,
  ) {}

  // ── Restaurant CRUD ─────────────────────────────────────

  async create(data: any, userId: string) {
    const { menus, ...restaurantData } = data;
    
    if (!restaurantData.city) restaurantData.city = 'Düzce';
    if (!restaurantData.district) restaurantData.district = 'Kaynaşlı';
    let lat = restaurantData.latitude ?? 40.7854;
    let lng = restaurantData.longitude ?? 31.3021;
    // latitude and longitude are stored directly
    if (!restaurantData.phone) restaurantData.phone = '0532 000 00 00';

    const restaurant = this.restaurantRepo.create({ ...restaurantData, createdById: userId } as any) as unknown as Restaurant;
    const savedRestaurant = await this.restaurantRepo.save(restaurant) as unknown as Restaurant;

    if (menus && Array.isArray(menus)) {
      for (const menuData of menus) {
        const { items, ...mInfo } = menuData;
        const menu = this.menuRepo.create({
          ...mInfo,
          restaurantId: savedRestaurant.id,
        });
        const savedMenu = (await this.menuRepo.save(menu)) as any;

        if (items && Array.isArray(items)) {
          for (const itemData of items) {
            const item = this.menuItemRepo.create({
              ...itemData,
              menuId: savedMenu.id,
            });
            await this.menuItemRepo.save(item);
          }
        }
      }
    }

    return this.findById(savedRestaurant.id);
  }

  async update(id: string, data: any, userId: string) {
    const restaurant = await this.restaurantRepo.findOne({ where: { id, isDeleted: false } });
    if (!restaurant) throw new NotFoundException('Lokanta bulunamadı');

    const userRole = await this.restaurantRepo.manager.query(`SELECT role FROM users WHERE id = $1`, [userId]);
    const isSuperAdmin = userRole?.[0]?.role === 'super_admin';
    if (restaurant.createdById !== userId && !isSuperAdmin) {
      throw new ForbiddenException('Bu işlemi yapmaya yetkiniz yok');
    }

    const { menus, ...restaurantData } = data;
    await this.restaurantRepo.update(id, restaurantData);

    if (menus && Array.isArray(menus)) {
      const oldMenus = await this.menuRepo.find({ where: { restaurantId: id } });
      for (const oldMenu of oldMenus) {
        await this.menuItemRepo.delete({ menuId: oldMenu.id });
        await this.menuRepo.delete(oldMenu.id);
      }

      for (const menuData of menus) {
        const { items, ...mInfo } = menuData;
        const menu = this.menuRepo.create({
          ...mInfo,
          restaurantId: id,
        });
        const savedMenu = (await this.menuRepo.save(menu)) as any;

        if (items && Array.isArray(items)) {
          for (const itemData of items) {
            const item = this.menuItemRepo.create({
              ...itemData,
              menuId: savedMenu.id,
            });
            await this.menuItemRepo.save(item);
          }
        }
      }
    }

    return this.findById(id);
  }

  async delete(id: string, userId: string) {
    const restaurant = await this.restaurantRepo.findOne({ where: { id, isDeleted: false } });
    if (!restaurant) throw new NotFoundException('Lokanta bulunamadı');

    const userRole = await this.restaurantRepo.manager.query(`SELECT role FROM users WHERE id = $1`, [userId]);
    const isSuperAdmin = userRole?.[0]?.role === 'super_admin';
    if (restaurant.createdById !== userId && !isSuperAdmin) {
      throw new ForbiddenException('Bu işlemi yapmaya yetkiniz yok');
    }

    restaurant.isDeleted = true;
    await this.restaurantRepo.save(restaurant);
    return { success: true };
  }

  async findById(id: string) {
    const restaurant = await this.restaurantRepo.findOne({
      where: { id, isDeleted: false },
      relations: ['images', 'menus', 'menus.items', 'reviews', 'reviews.replies'],
    });
    if (!restaurant) throw new NotFoundException('Lokanta bulunamadı');
    return restaurant;
  }

  async findAll(filters: {
    city?: string;
    district?: string;
    hasTirParking?: boolean;
    is247?: boolean;
    minRating?: number;
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const qb = this.restaurantRepo.createQueryBuilder('r')
      .where('r.isDeleted = false')
      .leftJoinAndSelect('r.images', 'images');

    if (filters.search) {
      qb.andWhere(
        '(r.name ILIKE :search OR r.fullAddress ILIKE :search OR r.services LIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    if (filters.city) qb.andWhere('r.city ILIKE :city', { city: `%${filters.city}%` });
    if (filters.district) qb.andWhere('r.district ILIKE :district', { district: `%${filters.district}%` });
    if (filters.hasTirParking) qb.andWhere('r.hasTirParking = :parking', { parking: true });
    if (filters.is247) qb.andWhere('r.is247 = :is247', { is247: true });
    if (filters.minRating) qb.andWhere('r.averageRating >= :minRating', { minRating: filters.minRating });

    const [restaurants, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('r.averageRating', 'DESC')
      .getManyAndCount();

    return { restaurants, total, page, totalPages: Math.ceil(total / limit) };
  }

  async findNearby(lat: number, lng: number, radiusKm: number = 10) {
    const radiusMeters = radiusKm * 1000;
    const restaurants = await this.restaurantRepo
      .createQueryBuilder('restaurant')
      .leftJoinAndSelect('restaurant.images', 'images')
      .where('restaurant.isDeleted = false')
      .andWhere('restaurant.workingStatus = :status', { status: WorkingStatus.ACTIVE })
      .getMany();

    return restaurants
      .map((r) => ({
        restaurant: r,
        distanceKm: (r.latitude != null && r.longitude != null) ? Math.round(calculateDistance(lat, lng, r.latitude, r.longitude) * 10) / 10 : 0,
      }))
      .filter((r) => r.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }

  async findAlongRoute(waypoints: { lat: number; lng: number }[], radiusKm: number = 10) {
    const restaurants = await this.restaurantRepo.find({
      where: { isDeleted: false, workingStatus: WorkingStatus.ACTIVE },
    });

    const matched: any[] = [];
    for (const r of restaurants) {
      if (r.latitude == null || r.longitude == null) continue;
      let minDeviation = Infinity;
      const rLng = r.longitude;
      const rLat = r.latitude;
      for (const wp of waypoints) {
        const dist = calculateDistance(wp.lat, wp.lng, rLat, rLng);
        if (dist < minDeviation) minDeviation = dist;
      }
      if (minDeviation <= radiusKm) {
        matched.push({ restaurant: r, deviationKm: Math.round(minDeviation * 10) / 10 });
      }
    }
    matched.sort((a, b) => a.deviationKm - b.deviationKm);
    return matched;
  }

  // ── Menu Management ─────────────────────────────────────

  async createMenu(restaurantId: string, data: Partial<Menu>) {
    await this.findById(restaurantId);
    return this.menuRepo.save(this.menuRepo.create({ ...data, restaurantId }));
  }

  async getMenus(restaurantId: string) {
    return this.menuRepo.find({
      where: { restaurantId, isActive: true },
      relations: ['items'],
      order: { sortOrder: 'ASC' },
    });
  }

  async addMenuItem(menuId: string, data: Partial<MenuItem>) {
    const menu = await this.menuRepo.findOne({ where: { id: menuId } });
    if (!menu) throw new NotFoundException('Menü bulunamadı');
    return this.menuItemRepo.save(this.menuItemRepo.create({ ...data, menuId }));
  }

  async updateMenuItem(itemId: string, data: Partial<MenuItem>) {
    const item = await this.menuItemRepo.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Menü öğesi bulunamadı');
    await this.menuItemRepo.update(itemId, data);
    return this.menuItemRepo.findOne({ where: { id: itemId } });
  }

  // ── Reviews ─────────────────────────────────────────────

  async addReview(restaurantId: string, userId: string, rating: number, comment: string, menuItemId?: string) {
    await this.findById(restaurantId);

    const review = this.reviewRepo.create({ restaurantId, userId, rating, comment, menuItemId });
    const saved = await this.reviewRepo.save(review);

    // Recalculate average rating
    const stats = await this.reviewRepo
      .createQueryBuilder('r')
      .select('AVG(r.rating)', 'avg')
      .addSelect('COUNT(r.id)', 'count')
      .where('r.restaurantId = :restaurantId', { restaurantId })
      .andWhere('r.isDeleted = false')
      .getRawOne();

    await this.restaurantRepo.update(restaurantId, {
      averageRating: parseFloat(Number(stats.avg).toFixed(1)),
      reviewCount: parseInt(stats.count, 10),
    });

    return saved;
  }

  async getReviews(restaurantId: string) {
    return this.reviewRepo.find({
      where: { restaurantId, isDeleted: false },
      relations: ['replies'],
      order: { createdAt: 'DESC' },
    });
  }

  async addReviewReply(reviewId: string, userId: string, message: string) {
    const review = await this.reviewRepo.findOne({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Yorum bulunamadı');
    return this.replyRepo.save(this.replyRepo.create({ reviewId, userId, message }));
  }

  async markReviewHelpful(reviewId: string) {
    await this.reviewRepo.increment({ id: reviewId }, 'helpfulCount', 1);
    return { success: true };
  }

  // ── Menu Item Reviews ──────────────────────────────────

  async addMenuItemReview(menuItemId: string, userId: string, rating: number, comment?: string) {
    return this.menuItemReviewRepo.save(
      this.menuItemReviewRepo.create({ menuItemId, userId, rating, comment }),
    );
  }

  // ── Reservations ────────────────────────────────────────

  async createReservation(restaurantId: string, userId: string, data: Partial<RestaurantReservation>) {
    // Check capacity constraints
    if (data.timeSlot) {
      await this.checkTimeSlotAvailability(restaurantId, data.timeSlot, data.reservedAt || new Date(), data.partySize || 1);
    }

    // Auto-assign table if tables exist
    let tableId = data.tableId;
    if (!tableId && data.partySize) {
      const availableTable = await this.findAvailableTable(restaurantId, data.partySize, data.timeSlot);
      if (availableTable) tableId = availableTable.id;
    }

    return this.reservationRepo.save(
      this.reservationRepo.create({
        ...data,
        tableId,
        restaurantId,
        userId,
        status: ReservationStatus.PENDING,
      }),
    );
  }

  async updateReservationStatus(id: string, status: ReservationStatus, userId: string) {
    const reservation = await this.reservationRepo.findOne({ where: { id } });
    if (!reservation) throw new NotFoundException('Rezervasyon bulunamadı');

    const now = new Date();
    const updates: Partial<RestaurantReservation> = { status };

    if (status === ReservationStatus.CONFIRMED) updates.confirmedAt = now;
    if (status === ReservationStatus.PREPARING) updates.preparingAt = now;
    if (status === ReservationStatus.READY) updates.readyAt = now;
    if (status === ReservationStatus.COMPLETED) updates.completedAt = now;

    Object.assign(reservation, updates);
    return this.reservationRepo.save(reservation);
  }

  async getReservations(restaurantId: string) {
    return this.reservationRepo.find({
      where: { restaurantId },
      order: { reservedAt: 'ASC' },
    });
  }

  async getReservationsByTimeSlot(restaurantId: string, timeSlot: string, date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.reservationRepo.find({
      where: {
        restaurantId,
        timeSlot,
        reservedAt: MoreThan(startOfDay),
      },
      order: { reservedAt: 'ASC' },
    });
  }

  // ── Time-slot & Capacity Validation ──────────────────

  async checkTimeSlotAvailability(
    restaurantId: string,
    timeSlot: string,
    date: Date,
    requestedPartySize: number,
  ): Promise<{ available: boolean; reason?: string }> {
    // Get capacity config
    const config = await this.capacityConfigRepo.findOne({
      where: { restaurantId, timeSlot, isActive: true },
    });

    const maxCapacity = config?.maxCapacity || 20;
    const maxReservations = config?.maxReservations || 10;

    // Count existing reservations for this time slot on this day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const existingReservations = await this.reservationRepo.find({
      where: {
        restaurantId,
        timeSlot,
        status: In([ReservationStatus.PENDING, ReservationStatus.CONFIRMED, ReservationStatus.PREPARING]),
      },
    });

    const currentPartyTotal = existingReservations.reduce((sum, r) => sum + (r.partySize || 1), 0);

    if (existingReservations.length >= maxReservations) {
      return { available: false, reason: `${timeSlot} zaman dilimi için maksimum rezervasyon sayısına (${maxReservations}) ulaşıldı` };
    }

    if (currentPartyTotal + requestedPartySize > maxCapacity) {
      return { available: false, reason: `${timeSlot} zaman dilimi için yeterli kapasite yok (mevcut: ${currentPartyTotal}/${maxCapacity} kişi)` };
    }

    return { available: true };
  }

  // ── Table Management ─────────────────────────────────

  async addTable(restaurantId: string, data: Partial<RestaurantTable>) {
    return this.tableRepo.save(this.tableRepo.create({ ...data, restaurantId }));
  }

  async getTables(restaurantId: string) {
    return this.tableRepo.find({ where: { restaurantId, isActive: true } });
  }

  async removeTable(tableId: string) {
    await this.tableRepo.update(tableId, { isActive: false });
    return { success: true };
  }

  async findAvailableTable(restaurantId: string, partySize: number, timeSlot?: string): Promise<RestaurantTable | null> {
    const tables = await this.tableRepo.find({
      where: { restaurantId, isActive: true },
      order: { capacity: 'ASC' },
    });

    // Find smallest table that fits the party
    const suitable = tables.filter(t => t.capacity >= partySize).sort((a, b) => a.capacity - b.capacity);

    if (suitable.length === 0) return null;

    // If timeSlot provided, check which tables are already reserved for that slot
    if (timeSlot) {
      const reservedTableIds = await this.reservationRepo
        .find({
          where: {
            restaurantId,
            timeSlot,
            status: In([ReservationStatus.PENDING, ReservationStatus.CONFIRMED]),
          },
        })
        .then(reservations => reservations.filter(r => r.tableId).map(r => r.tableId));

      const available = suitable.find(t => !reservedTableIds.includes(t.id));
      return available || suitable[0]; // Fall back to first suitable if all taken
    }

    return suitable[0];
  }

  // ── Capacity Config Management ───────────────────────

  async setCapacityConfig(restaurantId: string, data: Partial<RestaurantCapacityConfig>) {
    const existing = await this.capacityConfigRepo.findOne({
      where: { restaurantId, timeSlot: data.timeSlot },
    });
    if (existing) {
      Object.assign(existing, data);
      return this.capacityConfigRepo.save(existing);
    }
    return this.capacityConfigRepo.save(this.capacityConfigRepo.create({ ...data, restaurantId }));
  }

  async getCapacityConfigs(restaurantId: string) {
    return this.capacityConfigRepo.find({ where: { restaurantId, isActive: true } });
  }

  // ── EX-016: Kitchen Screen — get all reservations for restaurants owned by a user ──
  async getMyRestaurantReservations(ownerId: string) {
    const myRestaurants = await this.restaurantRepo.find({
      where: { createdById: ownerId, isDeleted: false },
    });
    if (!myRestaurants.length) return [];

    const restaurantIds = myRestaurants.map((r) => r.id);
    return this.reservationRepo.find({
      where: {
        restaurantId: In(restaurantIds),
        status: In([ReservationStatus.PENDING, ReservationStatus.CONFIRMED, ReservationStatus.PREPARING]),
      },
      order: { reservedAt: 'ASC' },
    });
  }

  // ── EX-016: ETA-based cron — auto-transition CONFIRMED → PREPARING 30 min before arrival ──
  @Cron('*/30 * * * * *')
  async autoPrepareUpcomingReservations() {
    const now = new Date();
    const thirtyMinFromNow = new Date(now.getTime() + 30 * 60 * 1000);

    const upcoming = await this.reservationRepo.find({
      where: {
        status: ReservationStatus.CONFIRMED,
        reservedAt: LessThanOrEqual(thirtyMinFromNow) as any,
      },
    });

    for (const res of upcoming) {
      if (res.reservedAt > now) {
        res.status = ReservationStatus.PREPARING;
        await this.reservationRepo.save(res);
      }
    }
  }

  // ── Favorites ───────────────────────────────────────────

  async addFavorite(userId: string, restaurantId: string) {
    const existing = await this.favoriteRepo.findOne({ where: { userId, restaurantId } });
    if (existing) return existing;
    return this.favoriteRepo.save(this.favoriteRepo.create({ userId, restaurantId }));
  }

  async removeFavorite(userId: string, restaurantId: string) {
    await this.favoriteRepo.delete({ userId, restaurantId });
    return { removed: true };
  }

  async getFavorites(userId: string) {
    return this.favoriteRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }
}
