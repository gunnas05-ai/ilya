import { Controller, Get, Put, Delete, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminRevenueService } from './admin-revenue.service';

@ApiTags('admin-revenue')
@Controller({ path: 'admin/revenue', version: '1' })
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class AdminRevenueController {
  constructor(private readonly service: AdminRevenueService) {}

  @Get('configs')
  @ApiOperation({ summary: 'Tum gelir configlerini getir (komisyon + kontor + plan)' })
  async getAll() { return this.service.getAllConfigs(); }

  // Komisyon
  @Put('commission/:id') @ApiOperation({ summary: 'Komisyon guncelle' })
  async updateComm(@Param('id') id: string, @Body() b: any) { return this.service.updateCommission(id, b); }
  @Delete('commission/:id') @ApiOperation({ summary: 'Komisyon sil/pasif yap' })
  async deleteComm(@Param('id') id: string) { return this.service.deleteCommission(id); }
  @Post('commission') @ApiOperation({ summary: 'Yeni komisyon ekle' })
  async createComm(@Body() b: any) { return this.service.createCommission(b); }

  // Kontör
  @Put('credits/:id') @ApiOperation({ summary: 'Kontor paketi guncelle' })
  async updateCredit(@Param('id') id: string, @Body() b: any) { return this.service.updateCreditPackage(id, b); }
  @Delete('credits/:id') @ApiOperation({ summary: 'Kontor paketi sil/pasif yap' })
  async deleteCredit(@Param('id') id: string) { return this.service.deleteCreditPackage(id); }
  @Post('credits') @ApiOperation({ summary: 'Yeni kontor paketi ekle' })
  async createCredit(@Body() b: any) { return this.service.createCreditPackage(b); }

  // Plan
  @Put('plans/:id') @ApiOperation({ summary: 'Abonelik plani guncelle' })
  async updatePlan(@Param('id') id: string, @Body() b: any) { return this.service.updatePlan(id, b); }
  @Delete('plans/:id') @ApiOperation({ summary: 'Abonelik plani sil/pasif yap' })
  async deletePlan(@Param('id') id: string) { return this.service.deletePlan(id); }
  @Post('plans') @ApiOperation({ summary: 'Yeni abonelik plani ekle' })
  async createPlan(@Body() b: any) { return this.service.createPlan(b); }

  @Put('site-fee') @ApiOperation({ summary: 'Site aidati guncelle' })
  async setSiteFee(@Body() b: { amount: number }) { return this.service.setSiteFee(b.amount); }

  @Get('report') @ApiOperation({ summary: 'Gelir raporu (today/week/month)' })
  async getReport(@Query('period') period?: string) { return this.service.getRevenueReport(period); }
}
