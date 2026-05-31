import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TrackingService } from './tracking.service';
import { DriverHoursService } from './driver-hours.service';

@Controller('tracking')
@UseGuards(AuthGuard('jwt'))
export class TrackingController {
  constructor(
    private trackingService: TrackingService,
    private driverHours: DriverHoursService,
  ) {}

  // EX-022: Driver hours / HOS endpoints
  @Post('driver/start-driving')
  async startDriving(@Body() body: { vehicleId: string; loadId: string; odometerKm?: number }, @Req() req: any) {
    return this.driverHours.startDriving(req.user.id, body.vehicleId, body.loadId, body.odometerKm);
  }

  @Post('driver/start-rest')
  async startRest(@Body() body: { odometerKm?: number }, @Req() req: any) {
    return this.driverHours.startRest(req.user.id, body.odometerKm);
  }

  @Post('driver/start-break')
  async startBreak(@Req() req: any) {
    return this.driverHours.startBreak(req.user.id);
  }

  @Get('driver/status')
  async getDriverStatus(@Req() req: any) {
    return this.driverHours.getDriverStatus(req.user.id);
  }

  @Get('driver/weekly-log')
  async getWeeklyLog(@Req() req: any) {
    return this.driverHours.getWeeklyLog(req.user.id);
  }

  @Post()
  async recordLocation(@Body() body: { loadId: string; latitude: number; longitude: number; speed?: number; heading?: number; accuracy?: number; label?: string }, @Req() req: any) {
    return this.trackingService.recordLocation({
      loadId: body.loadId, driverId: req.user.id, latitude: body.latitude, longitude: body.longitude,
      speed: body.speed, heading: body.heading, accuracy: body.accuracy, label: body.label,
    });
  }

  @Get(':loadId')
  async getHistory(@Param('loadId') loadId: string) {
    return this.trackingService.getTrackingHistory(loadId);
  }

  @Get(':loadId/latest')
  async getLatest(@Param('loadId') loadId: string) {
    return this.trackingService.getLatestPosition(loadId);
  }

  @Post(':loadId/share')
  async shareTracking(@Param('loadId') loadId: string) {
    return { data: await this.trackingService.generateShareLink(loadId) };
  }

  @Get('active')
  async getActive() {
    return { data: await this.trackingService.getActiveShipments() };
  }

  @Post(':loadId/verify-delivery')
  async verifyDelivery(
    @Param('loadId') loadId: string,
    @Body() body: { method: 'qr' | 'photo' | 'otp' | 'gps'; metadata?: any },
    @Req() req: any,
  ) {
    return this.trackingService.verifyDelivery({
      loadId,
      driverId: req.user.id,
      method: body.method,
      metadata: body.metadata,
    });
  }

  @Get(':loadId/verification')
  async getVerification(@Param('loadId') loadId: string) {
    return {
      verified: await this.trackingService.isDeliveryVerified(loadId),
      records: await this.trackingService.getDeliveryVerification(loadId),
    };
  }

  /** UX-004: Generate shareable tracking link */
  @Post(':loadId/share')
  async generateShareLink(@Param('loadId') loadId: string) {
    const crypto = require('crypto');
    const token = crypto.randomBytes(16).toString('hex');
    const shareUrl = `${process.env.APP_URL || 'https://kaptan.app'}/track/${token}`;
    return { shareUrl, token, expiresIn: '24 saat' };
  }
}
