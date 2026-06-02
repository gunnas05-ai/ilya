// @ts-nocheck
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RestaurantsService } from './restaurants.service';
import { ReservationStatus } from './reservation.entity';

@Controller('restaurants')
export class RestaurantsController {
  constructor(private service: RestaurantsService) {}

  // ── Restaurant CRUD ─────────────────────────────────────

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(@Body() body: { name: string; city: string; district: string; address: string; hasTirParking?: boolean }, @Req() req: any) {
    return this.service.create(body as any, req.user.id);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  async update(@Param('id') id: string, @Body() body: { name?: string; city?: string; district?: string; address?: string; hasTirParking?: boolean; isActive?: boolean }, @Req() req: any) {
    return this.service.update(id, body, req.user.id);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async delete(@Param('id') id: string, @Req() req: any) {
    return this.service.delete(id, req.user.id);
  }

  @Get()
  async findAll(
    @Query('city') city?: string,
    @Query('district') district?: string,
    @Query('hasTirParking') hasTirParking?: string,
    @Query('is247') is247?: string,
    @Query('minRating') minRating?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.service.findAll({
      city, district,
      hasTirParking: hasTirParking === 'true',
      is247: is247 === 'true',
      minRating: minRating ? parseFloat(minRating) : undefined,
      page, limit, search,
    });
  }

  @Get('nearby')
  async findNearby(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius?: string,
  ) {
    return this.service.findNearby(
      parseFloat(lat), parseFloat(lng),
      radius ? parseFloat(radius) : 10,
    );
  }

  @Post('route')
  async findAlongRoute(@Body() body: { waypoints: { lat: number; lng: number }[]; radiusKm?: number }) {
    return this.service.findAlongRoute(body.waypoints, body.radiusKm || 10);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  // ── Menus ───────────────────────────────────────────────

  @Post(':id/menus')
  @UseGuards(AuthGuard('jwt'))
  async createMenu(@Param('id') id: string, @Body() body: { name: string; description?: string }) {
    return this.service.createMenu(id, body);
  }

  @Get(':id/menus')
  async getMenus(@Param('id') id: string) {
    return this.service.getMenus(id);
  }

  @Post('menus/:menuId/items')
  @UseGuards(AuthGuard('jwt'))
  async addMenuItem(@Param('menuId') menuId: string, @Body() body: { name: string; price: number; description?: string; category?: string }) {
    return this.service.addMenuItem(menuId, body);
  }

  @Put('menu-items/:id')
  @UseGuards(AuthGuard('jwt'))
  async updateMenuItem(@Param('id') id: string, @Body() body: { name?: string; price?: number; description?: string; isAvailable?: boolean }) {
    return this.service.updateMenuItem(id, body);
  }

  // ── Reviews ─────────────────────────────────────────────

  @Post(':id/reviews')
  @UseGuards(AuthGuard('jwt'))
  async addReview(
    @Param('id') id: string,
    @Body() body: { rating: number; comment: string; menuItemId?: string },
    @Req() req: any,
  ) {
    return this.service.addReview(id, req.user.id, body.rating, body.comment, body.menuItemId);
  }

  @Get(':id/reviews')
  async getReviews(@Param('id') id: string) {
    return this.service.getReviews(id);
  }

  @Post('reviews/:reviewId/reply')
  @UseGuards(AuthGuard('jwt'))
  async addReviewReply(@Param('reviewId') reviewId: string, @Body() body: { content: string }, @Req() req: any) {
    return this.service.addReviewReply(reviewId, req.user.id, body.message);
  }

  @Post('reviews/:reviewId/helpful')
  async markHelpful(@Param('reviewId') reviewId: string) {
    return this.service.markReviewHelpful(reviewId);
  }

  @Post('menu-items/:id/reviews')
  @UseGuards(AuthGuard('jwt'))
  async addMenuItemReview(
    @Param('id') id: string,
    @Body() body: { rating: number; comment?: string },
    @Req() req: any,
  ) {
    return this.service.addMenuItemReview(id, req.user.id, body.rating, body.comment);
  }

  // ── Reservations ────────────────────────────────────────

  @Post(':id/reservations')
  @UseGuards(AuthGuard('jwt'))
  async createReservation(@Param('id') id: string, @Body() body: { date: string; time: string; partySize: number; specialRequests?: string }, @Req() req: any) {
    return this.service.createReservation(id, req.user.id, body);
  }

  @Get(':id/reservations')
  @UseGuards(AuthGuard('jwt'))
  async getReservations(@Param('id') id: string) {
    return this.service.getReservations(id);
  }

  @Post('reservations/:id/status')
  @UseGuards(AuthGuard('jwt'))
  async updateReservationStatus(
    @Param('id') id: string,
    @Body() body: { status: ReservationStatus },
    @Req() req: any,
  ) {
    return this.service.updateReservationStatus(id, body.status, req.user.id);
  }

  /** EX-016: Kitchen Screen — get all active reservations for the restaurant owner's venues */
  @Get('kitchen/reservations')
  @UseGuards(AuthGuard('jwt'))
  async getMyKitchenReservations(@Req() req: any) {
    return this.service.getMyRestaurantReservations(req.user.id);
  }

  // ── Favorites ───────────────────────────────────────────

  @Post(':id/favorite')
  @UseGuards(AuthGuard('jwt'))
  async addFavorite(@Param('id') id: string, @Req() req: any) {
    return this.service.addFavorite(req.user.id, id);
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

  // ── Table Management ───────────────────────────────

  @Post(':id/tables')
  @UseGuards(AuthGuard('jwt'))
  async addTable(@Param('id') id: string, @Body() body: { number: string; capacity: number; location?: string }) {
    return this.service.addTable(id, body);
  }

  @Get(':id/tables')
  async getTables(@Param('id') id: string) {
    return this.service.getTables(id);
  }

  @Delete(':id/tables/:tableId')
  @UseGuards(AuthGuard('jwt'))
  async removeTable(@Param('tableId') tableId: string) {
    return this.service.removeTable(tableId);
  }

  // ── Capacity Config ────────────────────────────────

  @Post(':id/capacity-config')
  @UseGuards(AuthGuard('jwt'))
  async setCapacityConfig(@Param('id') restaurantId: string, @Body() body: { maxCapacity?: number; reservationInterval?: number }) {
    return this.service.setCapacityConfig(restaurantId, body);
  }

  @Get(':id/capacity-config')
  async getCapacityConfigs(@Param('id') restaurantId: string) {
    return this.service.getCapacityConfigs(restaurantId);
  }

  // ── Time-slot Availability ─────────────────────────

  @Post(':id/check-availability')
  async checkAvailability(
    @Param('id') restaurantId: string,
    @Body() body: { timeSlot: string; date: string; partySize: number },
  ) {
    return this.service.checkTimeSlotAvailability(
      restaurantId,
      body.timeSlot,
      new Date(body.date),
      body.partySize || 1,
    );
  }

  @Get(':id/reservations/by-slot')
  async getReservationsByTimeSlot(
    @Param('id') restaurantId: string,
    @Query('timeSlot') timeSlot: string,
    @Query('date') date: string,
  ) {
    return this.service.getReservationsByTimeSlot(restaurantId, timeSlot, new Date(date || Date.now()));
  }
}
