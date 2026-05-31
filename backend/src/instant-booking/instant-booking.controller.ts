import { Controller, Get, Post, Param, Body, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InstantBookingService } from './instant-booking.service';

@Controller({ path: 'instant-book', version: '1' })
@UseGuards(AuthGuard('jwt'))
export class InstantBookingController {
  constructor(private readonly service: InstantBookingService) {}

  /** Yük veren: Anında rezervasyona aç */
  @Post(':loadId/enable')
  async enable(@Param('loadId') loadId: string, @Body() body: { price: number }) {
    return this.service.enableInstantBooking(loadId, body.price);
  }

  /** Yük veren: Anında rezervasyonu kapat */
  @Post(':loadId/disable')
  async disable(@Param('loadId') loadId: string) {
    return this.service.disableInstantBooking(loadId);
  }

  /** Taşıyıcı: Hemen Al (FCFS lock) */
  @Post(':loadId/book')
  async instantBook(@Param('loadId') loadId: string, @Req() req: any, @Body() body?: { carrierName?: string }) {
    return this.service.instantBook(loadId, req.user?.id || 'anonymous', body?.carrierName || req.user?.fullName || 'Taşıyıcı');
  }

  /** Taşıyıcı: Kilidi onayla */
  @Post(':loadId/confirm')
  async confirm(@Param('loadId') loadId: string, @Req() req: any) {
    return this.service.confirmBooking(loadId, req.user?.id);
  }

  /** Taşıyıcı: Kilidi bırak */
  @Post(':loadId/release')
  async release(@Param('loadId') loadId: string, @Req() req: any) {
    return this.service.releaseLock(loadId, req.user?.id);
  }

  /** Durum sorgula */
  @Get(':loadId/status')
  async status(@Param('loadId') loadId: string) {
    return this.service.getStatus(loadId);
  }

  /** Tüm anında alınabilir yükler */
  @Get('available')
  async listAvailable() {
    return { data: await this.service.listAvailable() };
  }
}
