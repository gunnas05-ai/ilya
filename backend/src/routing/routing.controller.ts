import { Controller, Post, Body, UseGuards, Req, Get, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RoutingService } from './routing.service';

@Controller('routing')
export class RoutingController {
  constructor(private readonly routingService: RoutingService) {}

  @Post('truck-route')
  @UseGuards(AuthGuard('jwt'))
  async calculateTruckRoute(@Body() body: any, @Req() req: any) {
    return this.routingService.calculateTruckRoute({
      origin: body.origin,
      destination: body.destination,
      waypoints: body.waypoints || [],
      vehicleProfile: body.vehicleProfile || {},
    });
  }

  @Get('restrictions')
  @UseGuards(AuthGuard('jwt'))
  async getRestrictions(@Query('lat') lat: number, @Query('lng') lng: number, @Query('radius') radius = 50) {
    return this.routingService.getNearbyRestrictions(lat, lng, radius);
  }

  @Post('check-bridge')
  @UseGuards(AuthGuard('jwt'))
  async checkBridgeClearance(@Body() body: any) {
    return this.routingService.checkBridgeClearance(body.vehicleHeight, body.routeCoordinates);
  }
}
