import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MarketplaceService } from './marketplace.service';
import { VehicleType } from './vehicle-detail.entity';

@Controller('marketplace')
@UseGuards(AuthGuard('jwt'))
export class MarketplaceController {
  constructor(private marketplaceService: MarketplaceService) {}

  // ── Categories ───────────────────────────────────────

  @Get('categories')
  async getCategories() {
    return this.marketplaceService.getCategories();
  }

  // ── Listings ─────────────────────────────────────────

  @Post('listings')
  async createListing(@Body() body: any, @Req() req: any) {
    return this.marketplaceService.createListing({ ...body, sellerId: req.user.id });
  }

  @Get('listings')
  async findAll(
    @Query('categoryId') categoryId?: string,
    @Query('city') city?: string,
    @Query('search') search?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('vehicleType') vehicleType?: VehicleType,
    @Query('sortBy') sortBy?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.marketplaceService.findAll({
      categoryId: categoryId ? +categoryId : undefined,
      city, search,
      minPrice: minPrice ? +minPrice : undefined,
      maxPrice: maxPrice ? +maxPrice : undefined,
      vehicleType, sortBy,
      sortOrder: 'DESC',
      page: page ? +page : 1,
      limit: limit ? +limit : 20,
    });
  }

  @Get('listings/:id')
  async findById(@Param('id') id: string) {
    return this.marketplaceService.findById(id);
  }

  @Put('listings/:id')
  async updateListing(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.marketplaceService.updateListing(id, req.user.id, body);
  }

  @Delete('listings/:id')
  async deleteListing(@Param('id') id: string, @Req() req: any) {
    return this.marketplaceService.deleteListing(id, req.user.id);
  }

  // ── Towing Compatibility ──────────────────────────────

  @Post('towing/check')
  async checkTowingCompatibility(@Body() body: { tractorListingId: string; trailerListingId: string }) {
    return this.marketplaceService.checkTowingCompatibility(body.tractorListingId, body.trailerListingId);
  }

  // ── Offers ────────────────────────────────────────────

  @Post('offers')
  async createOffer(@Body() body: any, @Req() req: any) {
    return this.marketplaceService.createOffer({ ...body, buyerId: req.user.id });
  }

  @Get('offers/listing/:listingId')
  async getOffersForListing(@Param('listingId') listingId: string, @Req() req: any) {
    return this.marketplaceService.getOffersForListing(listingId, req.user.id);
  }

  @Get('offers/my')
  async getMyOffers(@Req() req: any) {
    return this.marketplaceService.getMyOffers(req.user.id);
  }

  @Post('offers/:id/accept')
  async acceptOffer(@Param('id') id: string, @Req() req: any) {
    return this.marketplaceService.acceptOffer(id, req.user.id);
  }

  @Post('offers/:id/reject')
  async rejectOffer(@Param('id') id: string, @Req() req: any) {
    return this.marketplaceService.rejectOffer(id, req.user.id);
  }

  @Post('offers/:id/counter')
  async counterOffer(@Param('id') id: string, @Body() body: { counterAmount: number; counterMessage?: string }, @Req() req: any) {
    return this.marketplaceService.counterOffer(id, req.user.id, body.counterAmount, body.counterMessage);
  }
}
