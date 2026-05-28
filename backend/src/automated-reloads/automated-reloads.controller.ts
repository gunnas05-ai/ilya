import { Controller, Get, Post, Param, Query, Req } from '@nestjs/common';
import { AutomatedReloadsService } from './automated-reloads.service';

@Controller({ path: 'reloads', version: '1' })
export class AutomatedReloadsController {
  constructor(private readonly service: AutomatedReloadsService) {}

  /** Aktif reload önerilerini getir */
  @Get('active')
  async getActive(@Req() req: any, @Query('carrierId') carrierId?: string) {
    const cid = carrierId || req.user?.id;
    const bundles = await this.service.getActiveBundles(cid);
    return { data: bundles };
  }

  /** Geçmiş reload paketlerini getir */
  @Get('history')
  async getHistory(@Req() req: any, @Query('carrierId') carrierId?: string) {
    const cid = carrierId || req.user?.id;
    const bundles = await this.service.getBundleHistory(cid);
    return { data: bundles };
  }

  /** Paketi kabul et */
  @Post(':id/accept')
  async accept(@Param('id') id: string, @Req() req: any) {
    return this.service.acceptBundle(id, req.user?.id);
  }

  /** Paketi reddet */
  @Post(':id/decline')
  async decline(@Param('id') id: string, @Req() req: any) {
    return this.service.declineBundle(id, req.user?.id);
  }

  /** Manuel tetikleme: shipment ID ile reload ara (test için) */
  @Post('trigger/:shipmentId')
  async trigger(@Param('shipmentId') shipmentId: string, @Req() req: any) {
    const payload = {
      shipmentId,
      loadTitle: 'Test Seferi',
      fromCity: 'İstanbul',
      toCity: 'Ankara',
      carrierId: req.user?.id || 'demo',
      carrierName: req.user?.fullName || 'Test Taşıyıcı',
      deliveryLat: req.query.lat ? parseFloat(req.query.lat as string) : 39.93,
      deliveryLng: req.query.lng ? parseFloat(req.query.lng as string) : 32.86,
      deliveredAt: new Date(),
    };
    const bundle = await this.service.generateReloadBundle(payload);
    if (bundle) {
      await (this.service as any).notifyCarrier(bundle);
    }
    return { data: bundle, found: !!bundle };
  }
}
