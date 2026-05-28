import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LoadsService } from './loads.service';
import { PriceEstimateService } from './price-estimate.service';
import { EpdkScraperService } from './epdk-scraper.service';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';

@Controller('loads')
export class LoadsController {
  constructor(
    private loadsService: LoadsService,
    private priceEstimateService: PriceEstimateService,
    private epdkService: EpdkScraperService,
  ) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(@Body() body: any, @Req() req: any) {
    return this.loadsService.create(body, req.user.id);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('loadType') loadType?: string,
    @Query('fromCity') fromCity?: string,
    @Query('toCity') toCity?: string,
    @Query('vehicleType') vehicleType?: string,
    @Query('trailerType') trailerType?: string,
    @Query('coldChain') coldChain?: string,
    @Query('urgent') urgent?: string,
    @Query('escrow') escrow?: string,
    @Query('minTonnage') minTonnage?: string,
    @Query('maxTonnage') maxTonnage?: string,
    @Query('minVolume') minVolume?: string,
    @Query('maxVolume') maxVolume?: string,
    @Query('minDistance') minDistance?: string,
    @Query('maxDistance') maxDistance?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('nearbyLatitude') nearbyLatitude?: string,
    @Query('nearbyLongitude') nearbyLongitude?: string,
    @Query('nearbyRadiusKm') nearbyRadiusKm?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    return this.loadsService.findAll({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      search,
      loadType,
      fromCity,
      toCity,
      vehicleType,
      trailerType,
      coldChain: coldChain === 'true' ? true : undefined,
      urgent: urgent === 'true' ? true : undefined,
      escrow: escrow === 'true' ? true : undefined,
      minTonnage: minTonnage ? +minTonnage : undefined,
      maxTonnage: maxTonnage ? +maxTonnage : undefined,
      minVolume: minVolume ? +minVolume : undefined,
      maxVolume: maxVolume ? +maxVolume : undefined,
      minDistance: minDistance ? +minDistance : undefined,
      maxDistance: maxDistance ? +maxDistance : undefined,
      dateFrom,
      dateTo,
      nearbyLatitude: nearbyLatitude ? +nearbyLatitude : undefined,
      nearbyLongitude: nearbyLongitude ? +nearbyLongitude : undefined,
      nearbyRadiusKm: nearbyRadiusKm ? +nearbyRadiusKm : undefined,
      sortBy,
      sortOrder,
    });
  }

  @Get('my')
  @UseGuards(AuthGuard('jwt'))
  async getMyLoads(@Req() req: any) {
    return this.loadsService.getLoadsByCreator(req.user.id);
  }

  /** EX-007: Smart matching — recommended loads for carrier (MUST be before :id) */
  @Get('recommended')
  @UseGuards(AuthGuard('jwt'))
  async getRecommended(
    @Query('vehicleType') vehicleType?: string,
    @Query('trailerType') trailerType?: string,
    @Query('tonnageCapacity') tonnageCapacity?: string,
    @Query('volumeCapacity') volumeCapacity?: string,
    @Query('currentLatitude') currentLatitude?: string,
    @Query('currentLongitude') currentLongitude?: string,
    @Query('maxEmptyKm') maxEmptyKm?: string,
    @Query('limit') limit?: string,
  ) {
    return this.loadsService.recommendedLoads({
      carrierVehicleType: vehicleType,
      carrierTrailerType: trailerType,
      carrierTonnageCapacity: tonnageCapacity ? +tonnageCapacity : undefined,
      carrierVolumeCapacity: volumeCapacity ? +volumeCapacity : undefined,
      currentLatitude: currentLatitude ? +currentLatitude : undefined,
      currentLongitude: currentLongitude ? +currentLongitude : undefined,
      maxEmptyKm: maxEmptyKm ? +maxEmptyKm : undefined,
      limit: limit ? +limit : undefined,
    });
  }

  /** Get 5 most recent loads */
  @Get('recent')
  async getRecent() {
    return this.loadsService.getRecent(5);
  }

  /** Role-based load ranking */
  @Get('ranking')
  @UseGuards(AuthGuard('jwt'))
  async getRanking(@Req() req: any, @Query('role') role?: string) {
    return this.loadsService.getRanking(req.user.id, role || req.user.role);
  }

  /** EX-006: Market heatmap (static — MUST precede :id) */
  @Get('market-heatmap')
  @UseGuards(AuthGuard('jwt'))
  async getMarketHeatmap() {
    return this.priceEstimateService.getMarketHeatmap();
  }

  /** EX-006: Lane rates history */
  @Get('lane-rates-history')
  @UseGuards(AuthGuard('jwt'))
  async getLaneRatesHistory(@Query('from') from: string, @Query('to') to: string, @Query('months') months?: string) {
    return this.priceEstimateService.getLaneRatesHistory(from, to, months ? parseInt(months) : 6);
  }

  /** EX-006: Fuel prices */
  @Get('fuel-prices')
  @UseGuards(AuthGuard('jwt'))
  async getFuelPrices(@Query('history') history?: string) {
    const latest = await this.epdkService.getLatestPrices();
    const priceHistory = history === 'true' ? await this.epdkService.getPriceHistory(30) : undefined;
    return { latest, history: priceHistory };
  }

  /** Check if invoice exists for a load (role-based button visibility) */
  @Get(':id/invoice-status')
  @UseGuards(AuthGuard('jwt'))
  async getInvoiceStatus(@Param('id') id: string, @Req() req: any) {
    return this.loadsService.getInvoiceStatus(id, req.user.id);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  async getById(@Param('id') id: string) {
    return this.loadsService.findById(id);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  async update(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.loadsService.update(id, body, req.user.id);
  }

  /** UX-001: Instant Book — Anında Yük Kapma (Hemen Al) */
  @Post(':id/instant-book')
  @UseGuards(AuthGuard('jwt'))
  async instantBook(@Param('id') id: string, @Req() req: any) {
    return this.loadsService.instantBook(id, req.user.id);
  }
}
