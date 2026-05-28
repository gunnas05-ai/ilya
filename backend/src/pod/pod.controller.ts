import { Controller, Post, Body, Param, UseGuards, Req, Ip } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PodService } from './pod.service';

@Controller('pod')
export class PodController {
  constructor(private readonly podService: PodService) {}

  @Post(':loadId/signature')
  @UseGuards(AuthGuard('jwt'))
  async uploadSignature(
    @Param('loadId') loadId: string,
    @Body() body: any,
    @Req() req: any,
    @Ip() ip: string,
  ) {
    return this.podService.saveSignature({
      loadId,
      driverId: req.user.id,
      signatureImageBase64: body.signatureImageBase64,
      vectorPath: body.vectorPath,
      signerName: body.signerName,
      signerRole: body.signerRole,
      ipAddress: ip,
      deviceId: body.deviceId,
      latitude: body.latitude,
      longitude: body.longitude,
    });
  }

  @Post(':loadId/photo')
  @UseGuards(AuthGuard('jwt'))
  async uploadPhoto(
    @Param('loadId') loadId: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.podService.savePhoto({
      loadId,
      driverId: req.user.id,
      photoUrl: body.photoUrl,
      latitude: body.latitude,
      longitude: body.longitude,
    });
  }

  @Post(':loadId/damage-report')
  @UseGuards(AuthGuard('jwt'))
  async createDamageReport(
    @Param('loadId') loadId: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.podService.saveDamageReport({
      loadId,
      driverId: req.user.id,
      damageTypes: body.damageTypes || [],
      driverNote: body.driverNote || '',
      photoUrls: body.photoUrls || [],
      latitude: body.latitude,
      longitude: body.longitude,
    });
  }
}
