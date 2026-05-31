import { Controller, Post, Body, UseGuards, Req, Get, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RoutingService } from './routing.service';

@Controller('routing')
export class RoutingController {
  constructor(private readonly routingService: RoutingService) {}

  @Post('truck-route')
  @UseGuards(AuthGuard('jwt'))
  async calculateTruckRoute(@Body() body: { origin: { lat: number; lng: number }; destination: { lat: number; lng: number }; waypoints?: any[]; vehicleProfile?: { height?: number; weight?: number; length?: number; width?: number; hasRefrigeration?: boolean; adrClass?: string } }, @Req() req: any) {
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
  async checkBridgeClearance(@Body() body: { vehicleHeight: number; routeCoordinates: Array<{ lat: number; lng: number }> }) {
    return this.routingService.checkBridgeClearance(body.vehicleHeight, body.routeCoordinates);
  }
}
