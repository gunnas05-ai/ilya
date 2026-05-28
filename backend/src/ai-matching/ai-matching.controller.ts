import { Controller, Get, Post, Body, Query, Req } from '@nestjs/common';
import { AiMatchingService } from './ai-matching.service';
import { FeedbackAction } from './matching-feedback.entity';

@Controller({ path: 'matching', version: '1' })
export class AiMatchingController {
  constructor(private readonly service: AiMatchingService) {}

  /** Geri bildirim kaydet */
  @Post('feedback')
  async recordFeedback(@Body() body: any, @Req() req: any) {
    return this.service.recordFeedback({ ...body, carrierId: body.carrierId || req.user?.id });
  }

  /** Taşıyıcı tercih profili */
  @Get('preferences')
  async getPreferences(@Req() req: any, @Query('carrierId') carrierId?: string) {
    const cid = carrierId || req.user?.id;
    return { data: await this.service.getCarrierPreference(cid) };
  }

  /** Geri bildirim geçmişi */
  @Get('feedback')
  async getFeedback(@Req() req: any, @Query('carrierId') carrierId?: string) {
    const cid = carrierId || req.user?.id;
    return { data: await this.service.getFeedbackHistory(cid) };
  }

  /** Skor hesapla (dışarıdan yük listesiyle) */
  @Post('score')
  async scoreLoads(@Body() body: { loads: any[]; carrierId?: string }, @Req() req: any) {
    const cid = body.carrierId || req.user?.id;
    const pref = await this.service.getCarrierPreference(cid);
    const scored = this.service.scoreLoadsForCarrier(body.loads || [], cid, pref);
    return { data: scored };
  }
}
