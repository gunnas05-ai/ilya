// @ts-nocheck
import { Controller, Post, Get, Put, Delete, Param, Body, Req, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PartMarketService } from './part-market.service';

@ApiTags('part-market')
@Controller({ path: 'part-market', version: '1' })
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class PartMarketController {
  constructor(private readonly service: PartMarketService) {}

  @Get('categories') @ApiOperation({ summary: 'Kategorileri listele' })
  async getCategories(@Query('parentId') parentId?: string) { return this.service.getCategories(parentId); }

  @Post('listings') @ApiOperation({ summary: 'İlan oluştur' })
  async create(@Req() req: any, @Body() body: { title: string; categoryId: string; price: number; description: string; condition: string }) { return this.service.createListing(body as any, req.user.id); }

  @Get('listings') @ApiOperation({ summary: 'İlan listesi' })
  async list(@Query() q: any) { return this.service.getListings(q); }

  @Get('listings/:id') @ApiOperation({ summary: 'İlan detayı' })
  async getById(@Param('id') id: string) { return this.service.getListing(id); }

  @Put('listings/:id') @ApiOperation({ summary: 'İlan güncelle' })
  async update(@Param('id') id: string, @Req() req: any, @Body() body: { title?: string; price?: number; description?: string; condition?: string; status?: string }) { return this.service.updateListing(id, req.user.id, body); }

  @Delete('listings/:id') @ApiOperation({ summary: 'İlan kaldır' })
  async remove(@Param('id') id: string, @Req() req: any) { await this.service.deleteListing(id, req.user.id); return { success: true }; }

  @Post('offers') @ApiOperation({ summary: 'Teklif ver' })
  async createOffer(@Req() req: any, @Body() b: { listingId: string; amount: number; message?: string }) { return this.service.createOffer(b.listingId, req.user.id, b.amount, b.message); }

  @Get('offers/listing/:id') @ApiOperation({ summary: 'İlana gelen teklifler' })
  async getOffers(@Param('id') id: string, @Req() req: any) { return this.service.getOffersForListing(id, req.user.id); }

  @Put('offers/:id/accept') @ApiOperation({ summary: 'Teklif kabul et' })
  async acceptOffer(@Param('id') id: string, @Req() req: any) { return this.service.acceptOffer(id, req.user.id); }

  @Post('listings/:id/favorite') @ApiOperation({ summary: 'Favorilere ekle/çıkar' })
  async toggleFav(@Param('id') id: string, @Req() req: any) { return { favorited: await this.service.toggleFavorite(id, req.user.id) }; }

  @Get('favorites/my') @ApiOperation({ summary: 'Favorilerim' })
  async myFavs(@Req() req: any) { return this.service.getMyFavorites(req.user.id); }

  @Post('reviews') @ApiOperation({ summary: 'Değerlendirme yap' })
  async createReview(@Req() req: any, @Body() b: { listingId: string; rating: number; comment?: string }) { return this.service.createReview({ ...b, reviewerId: req.user.id }); }

  @Post('disputes') @ApiOperation({ summary: 'Sorun bildir' })
  async createDispute(@Req() req: any, @Body() b: { transactionId: string; reason: string; description: string }) { return this.service.createDispute({ ...b, openedBy: req.user.id }); }

  @Get('admin/pending') @ApiOperation({ summary: 'Onay bekleyen ilanlar (Admin)' })
  async pendingListings() { return this.service.getPendingListings(); }

  @Post('listings/:id/renew') @ApiOperation({ summary: 'İlan yenile' })
  async renew(@Param('id') id: string) { return this.service.renewListing(id); }

  @Post('listings/:id/mark-sold') @ApiOperation({ summary: 'Satıldı işaretle' })
  async markSold(@Param('id') id: string) { return this.service.markAsSold(id); }

  @Put('offers/:id/reject') @ApiOperation({ summary: 'Teklif reddet' })
  async rejectOffer(@Param('id') id: string) { return this.service.rejectOffer(id); }

  @Put('offers/:id/counter') @ApiOperation({ summary: 'Karşı teklif yap' })
  async counterOffer(@Param('id') id: string, @Body() b: { amount: number; message?: string }) { return this.service.counterOffer(id, b.amount, b.message); }

  @Get('offers/my') @ApiOperation({ summary: 'Verdiğim teklifler' })
  async myOffers(@Req() req: any) { return this.service.getMyOffers(req.user.id); }

  @Post('transactions') @ApiOperation({ summary: 'Satın al' })
  async createTransaction(@Req() req: any, @Body() b: { listingId: string }) { return this.service.createTransaction(b.listingId, req.user.id); }

  @Post('transactions/:id/confirm') @ApiOperation({ summary: 'Teslim aldım' })
  async confirmDelivery(@Param('id') id: string) { return this.service.confirmDelivery(id); }

  @Get('listings/my') @ApiOperation({ summary: 'İlanlarım' })
  async myListings(@Req() req: any) { return this.service.getMyListings(req.user.id); }

  @Post('listings/:id/boost') @ApiOperation({ summary: 'İlanı öne çıkar' })
  async boost(@Param('id') id: string, @Req() req: any, @Body() b: { plan: string }) { return this.service.boostListing(id, req.user.id, b.plan); }

  @Get('boosts/my') @ApiOperation({ summary: 'Aktif öne çıkarmalarım' })
  async myBoosts(@Req() req: any) { return this.service.getMyBoosts(req.user.id); }

  @Get('listings/nearby') @ApiOperation({ summary: 'Yakindaki ilanlar' })
  async nearby(@Query('lat') lat: number, @Query('lng') lng: number, @Query('radius') radius?: number) {
    return this.service.getListings({ lat, lng, radius: radius || 50, limit: 20 });
  }

  @Get('listings/compatible') @ApiOperation({ summary: 'Araca uyumlu parcalar' })
  async compatible(@Query('brand') brand: string, @Query('model') model: string) {
    return this.service.getListings({ brand, model, limit: 20 });
  }

  @Get('reviews/user/:userId') @ApiOperation({ summary: 'Kullanici degerlendirmeleri' })
  async userReviews(@Param('userId') userId: string) { return this.service.getUserReviews(userId); }

  @Get('categories/tree') @ApiOperation({ summary: 'Kategori agaci' })
  async categoryTree() { return this.service.getCategories(); }
}
