import {
  Controller, Post, Get, Patch, Param, Body, Req, UseGuards, Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ShipperApiService } from './shipper-api.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';

@ApiTags('shipper-api')
@Controller({ path: 'shipments', version: '1' })
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class ShipperApiController {
  constructor(private readonly service: ShipperApiService) {}

  @Post()
  @ApiOperation({ summary: 'Yeni sevkiyat olustur (Shipper API)' })
  async create(@Body() dto: CreateShipmentDto, @Req() req: any) {
    return this.service.createShipment(dto, req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Sevkiyat detayi getir' })
  async getById(@Param('id') id: string) {
    return this.service.getShipment(id);
  }

  @Get()
  @ApiOperation({ summary: 'Aktif sevkiyatlari listele' })
  @ApiQuery({ name: 'status', required: false, example: 'active' })
  async list(@Req() req: any) {
    return this.service.getActiveShipments(req.user.id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Sevkiyati iptal et' })
  async cancel(@Param('id') id: string, @Req() req: any) {
    return this.service.cancelShipment(id, req.user.id);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Sevkiyat durum gecmisi' })
  async getHistory(@Param('id') id: string) {
    return this.service.getStatusHistory(id);
  }
}
