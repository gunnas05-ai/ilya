import { Controller, Post, Get, Body, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ReturnLoadsService } from './return-loads.service';

export class SearchReturnLoadsDto {
  @IsNumber()
  @Type(() => Number)
  deliveryLatitude: number;

  @IsNumber()
  @Type(() => Number)
  deliveryLongitude: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  radiusKm?: number;
}

export class CalculateScoreDto {
  @IsString()
  loadId: string;

  @IsNumber()
  @Type(() => Number)
  deliveryLatitude: number;

  @IsNumber()
  @Type(() => Number)
  deliveryLongitude: number;

  @IsString()
  deliveryCompletedAt: string;
}

class ReserveLoadDto {
  @IsString()
  loadId: string;
}

@Controller('return-loads')
@UseGuards(AuthGuard('jwt'))
export class ReturnLoadsController {
  constructor(private returnLoadsService: ReturnLoadsService) {}

  @Get()
  async searchGet(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius: string,
    @Req() req: any,
  ) {
    const carrierProfile = req.user || {};
    return this.returnLoadsService.searchReturnLoads({
      deliveryLatitude: parseFloat(lat) || 39.9,
      deliveryLongitude: parseFloat(lng) || 32.8,
      radiusKm: parseInt(radius) || 100,
      carrierVehicleType: carrierProfile.vehicleType,
      carrierTonnageCapacity: carrierProfile.tonnageCapacity,
      carrierVolumeCapacity: carrierProfile.volumeCapacity,
      deliveryCompletedAt: new Date(),
    });
  }

  @Post('search')
  async search(@Body() dto: SearchReturnLoadsDto, @Req() req: any) {
    const carrierProfile = req.user; // includes vehicleType, tonnageCapacity, volumeCapacity

    return this.returnLoadsService.searchReturnLoads({
      deliveryLatitude: dto.deliveryLatitude,
      deliveryLongitude: dto.deliveryLongitude,
      radiusKm: dto.radiusKm || 100,
      carrierVehicleType: carrierProfile.vehicleType,
      carrierTonnageCapacity: carrierProfile.tonnageCapacity,
      carrierVolumeCapacity: carrierProfile.volumeCapacity,
      deliveryCompletedAt: new Date(),
    });
  }

  @Post('reserve')
  async reserve(@Body() dto: ReserveLoadDto, @Req() req: any) {
    await this.returnLoadsService.reserveLoad(dto.loadId, req.user.id);
    return { reserved: true };
  }

  @Post('release-reservation')
  async releaseReservation(@Body() dto: ReserveLoadDto, @Req() req: any) {
    await this.returnLoadsService.releaseReservation(dto.loadId, req.user.id);
    return { released: true };
  }

  @Post('calculate-score')
  async calculateScore(@Body() dto: CalculateScoreDto, @Req() req: any) {
    const carrierProfile = req.user;

    return this.returnLoadsService.searchReturnLoads({
      deliveryLatitude: dto.deliveryLatitude,
      deliveryLongitude: dto.deliveryLongitude,
      radiusKm: 500, // max radius to ensure we find the specific load
      carrierVehicleType: carrierProfile.vehicleType,
      carrierTonnageCapacity: carrierProfile.tonnageCapacity,
      carrierVolumeCapacity: carrierProfile.volumeCapacity,
      deliveryCompletedAt: new Date(dto.deliveryCompletedAt),
    });
  }
}
