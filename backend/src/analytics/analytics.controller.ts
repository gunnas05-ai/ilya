import { Controller, Get, Post, Param, Query, UseGuards, Req, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AnalyticsService } from './analytics.service';
import { CarrierScorecardService } from './carrier-scorecard.service';
import { AnalyticsPeriod } from './carrier-analytics.entity';

@Controller('analytics')
@UseGuards(AuthGuard('jwt'))
export class AnalyticsController {
  constructor(
    private analyticsService: AnalyticsService,
    private scorecardService: CarrierScorecardService,
  ) {}

  @Get('efficiency')
  async getEfficiency(@Req() req: any, @Query('period') period?: AnalyticsPeriod) {
    return this.analyticsService.getEfficiency(req.user.id, period);
  }

  @Get('history')
  async getHistory(@Req() req: any) {
    return this.analyticsService.getEfficiencyHistory(req.user.id);
  }

  @Get('leaderboard')
  async getLeaderboard(@Query('period') period?: AnalyticsPeriod) {
    return this.analyticsService.getLeaderboard(period);
  }

  @Post('record-trip')
  async recordTrip(@Req() req: any, @Query('emptyKm') emptyKm: string, @Query('loadedKm') loadedKm: string) {
    return this.analyticsService.recordCompletedTrip({
      carrierId: req.user.id,
      emptyKm: parseFloat(emptyKm) || 0,
      loadedKm: parseFloat(loadedKm) || 0,
      hadReturnLoad: false,
      fillRate: 0,
      revenue: 0,
    });
  }

  /** EX-008: Get own carrier scorecard */
  @Get('scorecard')
  async getMyScorecard(@Req() req: any) {
    return this.scorecardService.getScorecard(req.user.id);
  }

  /** EX-008: Get specific carrier scorecard (for load giver viewing bidder) */
  @Get('scorecard/:carrierId')
  async getCarrierScorecard(@Param('carrierId') carrierId: string) {
    return this.scorecardService.getScorecard(carrierId);
  }

  /** EX-008: Get bidder score summary (lightweight for bid cards) */
  @Get('scorecard/:carrierId/summary')
  async getBidderScoreSummary(@Param('carrierId') carrierId: string) {
    return this.scorecardService.getBidderScore(carrierId);
  }

  /** EX-008: Leaderboard of top-scored carriers */
  @Get('scorecards/leaderboard')
  async getScorecardLeaderboard(@Query('limit') limit?: string) {
    return this.scorecardService.getLeaderboard(limit ? parseInt(limit) : 20);
  }

  // ── EX-014: Shipper Dashboard ─────────────────────────

  @Get('shipper-dashboard')
  async getShipperDashboard(@Req() req: any) {
    return this.analyticsService.getShipperDashboard(req.user.id);
  }

  // ── EX-014: Lane Analytics ────────────────────────────

  @Get('lane-analytics')
  async getLaneAnalytics() {
    return this.analyticsService.getLaneAnalytics();
  }

  // ── EX-014: CSV Export ────────────────────────────────

  @Get('export')
  async exportCSV(@Query('type') type: string, @Req() req: any, @Res() res: any) {
    const result = await this.analyticsService.exportCSV(req.user.id, type);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.csv);
  }
}
