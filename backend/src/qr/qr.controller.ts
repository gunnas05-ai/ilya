import { Controller, Post, Get, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { QrService } from './qr.service';

@Controller('qr')
@UseGuards(AuthGuard('jwt'))
export class QrController {
  constructor(private qrService: QrService) {}

  @Post('generate')
  async generate(@Body() body: any) {
    return this.qrService.generateQR({
      loadId: body.loadId,
      driverId: body.driverId,
      customerId: body.customerId,
      checkpointType: body.checkpointType,
      milestoneIndex: body.milestoneIndex,
    });
  }

  @Post('validate')
  async validate(@Body() body: any, @Req() req: any) {
    return this.qrService.validateQR(body.token, {
      userId: req.user.id,
      latitude: body.latitude,
      longitude: body.longitude,
      accuracy: body.accuracy,
      speed: body.speed,
      deviceFingerprint: req.headers['x-device-fingerprint'],
      ipAddress: req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for'],
    });
  }

  @Get('history/:loadId')
  async getHistory(@Param('loadId') loadId: string) {
    return this.qrService.getQRHistory(loadId);
  }
}
