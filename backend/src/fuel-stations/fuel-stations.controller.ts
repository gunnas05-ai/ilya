/**
 * FuelStationsController — 498 satir, 40+ endpoint.
 * REFACTOR PLANI:
 *   - StationsController      (CRUD, list, search)
 *   - PricesController        (fiyat, EPDK, history)
 *   - ReviewsController       (yorum, puan)
 *   - FavoritesController     (favori yonetimi)
 *   - FuelCardController      (yakit karti)
 *   - AlertsController        (fiyat alarmlari)
 */
import { Controller, Get, Post, Put, Delete, Body, Param, Query, Headers, UseGuards, Req, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import * as multer from 'multer';
import { join } from 'path';
import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { FuelStationsService } from './fuel-stations.service';
import { FuelCardService } from './fuel-card.service';
import { FuelType } from './fuel-price.entity';
import { StationServiceType } from './station-service.entity';
import { ImageType } from './station-image.entity';
import { StationAuditAction } from './station-audit-log.entity';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { Throttle } from '@nestjs/throttler';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function imageFileFilter(_req: any, file: Express.Multer.File, cb: (error: any, accept: boolean) => void) {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(new BadRequestException(`Desteklenmeyen dosya türü: ${file.mimetype}. İzin verilenler: JPEG, PNG, WebP, AVIF`), false);
    return;
  }
  cb(null, true);
}

@Controller('fuel-stations')
export class FuelStationsController {
  constructor(
    private service: FuelStationsService,
    private fuelCardService: FuelCardService,
  ) {}

  // ── Station CRUD ────────────────────────────────────────

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(
    @Body() body: { name: string; city: string; district: string; brand: string; latitude: number; longitude: number; is247?: boolean; hasCharging?: boolean },
    @Req() req: any,
    @Headers('x-device-fingerprint') deviceFingerprint?: string,
  ) {
    return this.service.create({ ...body, deviceFingerprint }, req.user.id);
  }

  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(3600)
  @Throttle({ default: { ttl: 1000, limit: 10 } })
  async findAll(
    @Query('city') city?: string,
    @Query('district') district?: string,
    @Query('brand') brand?: string,
    @Query('serviceTypes') serviceTypes?: string,
    @Query('fuelType') fuelType?: FuelType,
    @Query('is247') is247?: string,
    @Query('hasCharging') hasCharging?: string,
    @Query('minRating') minRating?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('sortBy') sortBy?: 'name' | 'rating' | 'createdAt',
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.service.findAll({
      city, district, brand,
      serviceTypes: serviceTypes?.split(',') as StationServiceType[],
      fuelType,
      is247: is247 === 'true',
      hasCharging: hasCharging === 'true',
      minRating: minRating ? parseFloat(minRating) : undefined,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      sortBy, sortOrder, page, limit, search,
    });
  }

  @Get('nearby')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(3600)
  @Throttle({ default: { ttl: 1000, limit: 10 } })
  async findNearby(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius?: string,
    @Query('fuelType') fuelType?: FuelType,
  ) {
    return this.service.findNearby(
      parseFloat(lat), parseFloat(lng),
      radius ? parseFloat(radius) : 10,
      fuelType,
    );
  }

  @Post('route')
  @Throttle({ default: { ttl: 1000, limit: 10 } })
  async findAlongRoute(@Body() body: { waypoints: { lat: number; lng: number }[]; radiusKm?: number; fuelType?: FuelType }) {
    return this.service.findAlongRoute(body.waypoints, body.radiusKm || 5, body.fuelType);
  }

  @Post('route/recommendations')
  @Throttle({ default: { ttl: 1000, limit: 10 } })
  async getRouteRecommendations(@Body() body: { waypoints: { lat: number; lng: number }[]; fuelType?: FuelType }) {
    return this.service.getRouteRecommendations(body.waypoints, body.fuelType);
  }

  // ── Price Comparison ──────────────────────────────────

  @Get('prices/compare')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(900)
  @Throttle({ default: { ttl: 500, limit: 10 } })
  async comparePrices(
    @Query('fuelType') fuelType?: FuelType,
    @Query('city') city?: string,
    @Query('brand') brand?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('minRating') minRating?: string,
    @Query('isOpen') isOpen?: string,
    @Query('sortBy') sortBy: 'price' | 'distance' | 'rating' | 'freshness' | 'premium' = 'price',
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.comparePrices({
      fuelType, city, brand,
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      minRating: minRating ? parseFloat(minRating) : undefined,
      isOpen: isOpen === 'true',
      sortBy, sortOrder, page, limit,
    });
  }

  // ── Polling Fallback (lightweight) ───────────────────

  @Get('poll')
  @Throttle({ default: { ttl: 2000, limit: 30 } })
  async poll(
    @Query('since') since: string,
    @Query('city') city?: string,
    @Query('fuelType') fuelType?: FuelType,
  ) {
    const sinceDate = since ? new Date(since) : new Date(Date.now() - 300000);
    return this.service.getUpdatedSince(sinceDate, city, fuelType);
  }

  // ── Community Price Reporting ─────────────────────────

  @Post(':id/prices/report')
  @UseGuards(AuthGuard('jwt'))
  @Throttle({ default: { ttl: 500, limit: 5 } })
  async reportPrice(
    @Param('id') id: string,
    @Body() body: { fuelType: FuelType; price: number },
    @Req() req: any,
  ) {
    return this.service.reportPrice(id, body.fuelType, body.price, req.user.id);
  }

  // ── Admin ─────────────────────────────────────────────

  @Get('prices/flagged')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'super_admin')
  async getFlaggedPrices() {
    return this.service.getFlaggedPrices();
  }

  @Get('prices/stale')
  @Throttle({ default: { ttl: 1000, limit: 5 } })
  async getStalePrices(@Query('stationId') stationId?: string) {
    return this.service.getStalePrices(stationId);
  }

  @Post('prices/:id/confirm')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'super_admin')
  async confirmPrice(@Param('id') id: string, @Req() req: any) {
    return this.service.confirmPrice(id, req.user.id);
  }

  // ── EX-010: Bulk Import ──────────────────────────────

  @Post('prices/bulk-import')
  @UseGuards(AuthGuard('jwt'))
  async bulkImportPrices(
    @Body() body: { stationId: string; prices: Array<{ fuelType: string; price: number }> },
    @Req() req: any,
  ) {
    if (!body.stationId || !body.prices || !Array.isArray(body.prices)) {
      throw new BadRequestException('stationId ve prices dizisi zorunludur');
    }
    return this.service.bulkImportPrices(body.stationId, body.prices, req.user.id);
  }

  /** EX-010: Get EPDK reference/tavan prices for comparison */
  @Get('prices/epdk-reference')
  async getEpdkReference() {
    return this.service.getEpdkReferencePrices();
  }

  // ── Audit Logs ────────────────────────────────────────

  @Get('audit-logs')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'super_admin')
  async getAuditLogs(
    @Query('stationId') stationId?: string,
    @Query('action') action?: StationAuditAction,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.getAuditLogs(stationId, action, page, limit);
  }

  // ── Saved Filters (MUST be before catch-all :id) ──────────

  @Post('filters')
  @UseGuards(AuthGuard('jwt'))
  async createFilter(@Body() body: any, @Req() req: any) {
    return this.service.createFilter(req.user.id, body);
  }

  @Get('filters')
  @UseGuards(AuthGuard('jwt'))
  async getFilters(@Req() req: any) {
    return this.service.getFilters(req.user.id);
  }

  @Put('filters/:id')
  @UseGuards(AuthGuard('jwt'))
  async updateFilter(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.service.updateFilter(id, req.user.id, body);
  }

  @Delete('filters/:id')
  @UseGuards(AuthGuard('jwt'))
  async deleteFilter(@Param('id') id: string, @Req() req: any) {
    return this.service.deleteFilter(id, req.user.id);
  }

  // ── Station Detail ────────────────────────────────────

  @Get(':id')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(3600)
  @Throttle({ default: { ttl: 1000, limit: 10 } })
  async findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  async update(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: any,
    @Headers('x-device-fingerprint') deviceFingerprint?: string,
  ) {
    return this.service.update(id, { ...body, deviceFingerprint }, req.user.id);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async delete(@Param('id') id: string, @Req() req: any) {
    return this.service.delete(id, req.user.id);
  }

  // ── Working Hours ──────────────────────────────────────

  @Put(':id/working-hours')
  @UseGuards(AuthGuard('jwt'))
  async setWorkingHours(
    @Param('id') id: string,
    @Body() body: { is247?: boolean; workingHours?: { day: string; open: string; close: string }[]; holidayOverrides?: { date: string; open: string; close: string; closed: boolean }[]; timezone?: string },
  ) {
    return this.service.setWorkingHours(id, body);
  }

  // ── Brands ─────────────────────────────────────────────

  @Get('brands/list')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(3600)
  async getBrands() {
    return this.service.getBrands();
  }

  @Post('brands')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'super_admin')
  async createBrand(@Body() body: { name: string; logoUrl?: string; color?: string }) {
    return this.service.createBrand(body);
  }

  // ── Station Services ───────────────────────────────────

  @Post(':id/services')
  @UseGuards(AuthGuard('jwt'))
  async addService(@Param('id') id: string, @Body() body: { serviceType: StationServiceType }) {
    return this.service.addStationService(id, body.serviceType);
  }

  @Delete(':id/services/:serviceType')
  @UseGuards(AuthGuard('jwt'))
  async removeService(@Param('id') id: string, @Param('serviceType') serviceType: StationServiceType) {
    return this.service.removeStationService(id, serviceType);
  }

  @Get(':id/services')
  async getServices(@Param('id') id: string) {
    return this.service.getStationServices(id);
  }

  // ── Prices ──────────────────────────────────────────────

  @Post(':id/prices')
  @UseGuards(AuthGuard('jwt'))
  @Throttle({ default: { ttl: 500, limit: 10 } })
  async updatePrice(
    @Param('id') id: string,
    @Body() body: { fuelType: FuelType; price: number },
    @Req() req: any,
  ) {
    return this.service.updatePrice(id, body.fuelType, body.price, req.user.id);
  }

  @Get(':id/prices/history')
  async getPriceHistory(
    @Param('id') id: string,
    @Query('fuelType') fuelType: FuelType,
    @Query('days') days?: string,
  ) {
    return this.service.getPriceHistory(id, fuelType, days ? parseInt(days) : 30);
  }

  // ── Reviews ─────────────────────────────────────────────

  @Post(':id/reviews')
  @UseGuards(AuthGuard('jwt'))
  async addReview(
    @Param('id') id: string,
    @Body() body: { rating: number; comment: string },
    @Req() req: any,
  ) {
    return this.service.addReview(id, req.user.id, body.rating, body.comment);
  }

  @Get(':id/reviews')
  async getReviews(@Param('id') id: string) {
    return this.service.getReviews(id);
  }

  // ── Images ──────────────────────────────────────────────

  @Post(':id/images')
  @UseGuards(AuthGuard('jwt'))
  async addImage(
    @Param('id') id: string,
    @Body() body: { imageType: ImageType; url: string },
    @Req() req: any,
  ) {
    return this.service.addImage(id, body.imageType, body.url, req.user.id);
  }

  @Post(':id/images/upload')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('file', {
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: imageFileFilter,
  }))
  async uploadImage(
    @Param('id') id: string,
    @Body() body: { imageType?: ImageType },
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    const imageType = body.imageType || ImageType.GENEL_GORUNUM;
    const uploadPath = join(process.cwd(), 'uploads', 'stations');
    mkdirSync(uploadPath, { recursive: true });

    // WebP conversion + EXIF stripping + compression via sharp
    const webpFilename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
    const webpPath = join(uploadPath, webpFilename);

    await sharp(file.buffer)
      .webp({ quality: 80, effort: 4 })
      .withMetadata({ exif: undefined, icc: undefined }) // strip EXIF
      .toFile(webpPath);

    const url = `/uploads/stations/${webpFilename}`;
    return this.service.addImage(id, imageType, url, req.user.id);
  }

  @Get(':id/images')
  async getImages(@Param('id') id: string) {
    return this.service.getImages(id);
  }

  // ── Favorites & Visits ───────────────────────────────────

  @Post(':id/favorite')
  @UseGuards(AuthGuard('jwt'))
  async addFavorite(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.service.addFavorite(req.user.id, id, body?.note);
  }

  @Delete(':id/favorite')
  @UseGuards(AuthGuard('jwt'))
  async removeFavorite(@Param('id') id: string, @Req() req: any) {
    return this.service.removeFavorite(req.user.id, id);
  }

  @Get('favorites/my')
  @UseGuards(AuthGuard('jwt'))
  async getMyFavorites(@Req() req: any) {
    return this.service.getFavorites(req.user.id);
  }

  @Get('visits/recent')
  @UseGuards(AuthGuard('jwt'))
  async getRecentlyVisited(@Req() req: any) {
    return this.service.getRecentlyVisited(req.user.id);
  }

  @Post(':id/visit')
  @UseGuards(AuthGuard('jwt'))
  async recordVisit(@Param('id') id: string, @Req() req: any) {
    return this.service.recordVisit(req.user.id, id);
  }

  // ── Alerts ──────────────────────────────────────────────

  @Post('alerts')
  @UseGuards(AuthGuard('jwt'))
  async createAlert(@Body() body: any, @Req() req: any) {
    return this.service.createAlert(body, req.user.id);
  }

  @Get('alerts/my')
  @UseGuards(AuthGuard('jwt'))
  async getMyAlerts(@Req() req: any) {
    return this.service.getAlerts(req.user.id);
  }

  @Post('alerts/:id/disable')
  @UseGuards(AuthGuard('jwt'))
  async disableAlert(@Param('id') id: string, @Req() req: any) {
    return this.service.disableAlert(id, req.user.id);
  }

  @Put('alerts/:id/settings')
  @UseGuards(AuthGuard('jwt'))
  async updateAlertSettings(
    @Param('id') id: string,
    @Body() body: { isMuted?: boolean; muteUntil?: string; repeatFrequency?: number },
    @Req() req: any,
  ) {
    return this.service.updateAlertSettings(id, req.user.id, body);
  }

  // ── EX-024: Fuel Card Management ──────────────────────

  @Post('fuel-cards')
  @UseGuards(AuthGuard('jwt'))
  async registerFuelCard(@Body() body: any, @Req() req: any) {
    return this.fuelCardService.registerCard({ ...body, userId: req.user.id });
  }

  @Get('fuel-cards')
  @UseGuards(AuthGuard('jwt'))
  async getMyFuelCards(@Req() req: any) {
    return this.fuelCardService.getMyCards(req.user.id);
  }

  @Get('fuel-cards/:id/transactions')
  @UseGuards(AuthGuard('jwt'))
  async getCardTransactions(@Param('id') id: string, @Req() req: any) {
    return this.fuelCardService.getCardTransactions(id, req.user.id);
  }

  @Post('fuel-cards/webhook/:provider')
  async fuelCardWebhook(@Param('provider') provider: string, @Body() payload: any) {
    return this.fuelCardService.handleProviderWebhook(provider, payload);
  }
}
