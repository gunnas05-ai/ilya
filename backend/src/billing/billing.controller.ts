import { Controller, Post, Get, Put, Delete, Param, Body, Req, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionService } from './subscription.service';
import { CreditService } from './credit.service';
import { CommissionService } from './commission.service';

@ApiTags('billing')
@Controller({ path: 'billing', version: '1' })
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class BillingController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly creditService: CreditService,
    private readonly commissionService: CommissionService,
  ) {}

  // ── Abonelik ──
  @Get('plans')
  @ApiOperation({ summary: 'Abonelik paketlerini listele' })
  async getPlans() {
    return this.subscriptionService.getPlans();
  }

  @Post('subscribe')
  @ApiOperation({ summary: 'Paket satin al' })
  async subscribe(
    @Req() req: any,
    @Body() body: { planId: string; paymentMethodId: string },
  ) {
    return this.subscriptionService.purchase(req.user.id, body.planId, body.paymentMethodId);
  }

  @Get('subscription')
  @ApiOperation({ summary: 'Aktif aboneligi gor' })
  async getSubscription(@Req() req: any) {
    return this.subscriptionService.getActiveSubscription(req.user.id);
  }

  @Delete('subscription')
  @ApiOperation({ summary: 'Aboneligi iptal et (donem sonunda)' })
  async cancelSubscription(@Req() req: any) {
    await this.subscriptionService.cancelSubscription(req.user.id);
    return { success: true, message: 'Abonelik donem sonunda iptal edilecek.' };
  }

  // ── Kontör ──
  @Get('credits/packages')
  @ApiOperation({ summary: 'Kontör paketlerini listele' })
  async getCreditPackages() {
    return this.creditService.getPackages();
  }

  @Get('credits/balance')
  @ApiOperation({ summary: 'Kontör bakiyesi' })
  async getCreditBalance(@Req() req: any) {
    return this.creditService.getUserCredits(req.user.id);
  }

  @Post('credits/buy')
  @ApiOperation({ summary: 'Kontör satin al' })
  async buyCredits(
    @Req() req: any,
    @Body() body: { packageId: string; paymentMethodId: string },
  ) {
    return this.creditService.purchase(req.user.id, body.packageId, body.paymentMethodId);
  }

  @Get('credits/transactions')
  @ApiOperation({ summary: 'Kontör islem gecmisi' })
  async getCreditHistory(@Req() req: any, @Query('limit') limit?: number) {
    return this.creditService.getTransactions(req.user.id, limit || 20);
  }

  @Put('credits/packages/:id')
  @ApiOperation({ summary: 'Kontör paketini güncelle (Admin)' })
  async updateCreditPackage(@Param('id') id: string, @Body() body: any) {
    return this.creditService.updatePackage(id, body);
  }

  // ── Plan Yönetimi (Admin) ──
  @Put('plans/:id')
  @ApiOperation({ summary: 'Abonelik planini güncelle (Admin)' })
  async updatePlan(@Param('id') id: string, @Body() body: any) {
    return this.subscriptionService.updatePlan(id, body);
  }

  // ── Komisyon (Admin) ──
  @Get('commission/configs')
  @ApiOperation({ summary: 'Komisyon oranlarini listele' })
  async getCommissionConfigs() {
    return this.commissionService.getAllConfigs();
  }

  @Put('commission/configs/:name')
  @ApiOperation({ summary: 'Komisyon oranini guncelle' })
  async updateCommissionConfig(@Param('name') name: string, @Body() body: { rate: number }) {
    return this.commissionService.updateConfig(name, body.rate);
  }

  @Get('commission/report')
  @ApiOperation({ summary: 'Komisyon raporu (today/week/month/year)' })
  async getCommissionReport(@Query('period') period?: string) {
    return this.commissionService.getCommissionReport((period as any) || 'month');
  }
}
