import {
  Controller, Post, Get, Patch, Param, Body, Query, Req, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CarrierApiService } from './carrier-api.service';
import { AcceptLoadDto, UpdateStatusDto } from './dto/accept-load.dto';

@ApiTags('carrier-api')
@Controller({ path: 'carrier', version: '1' })
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class CarrierApiController {
  constructor(private readonly service: CarrierApiService) {}

  @Get('loads')
  @ApiOperation({ summary: 'Uygun yukleri listele (konum, kapasite filtreli)' })
  @ApiQuery({ name: 'lat', required: false })
  @ApiQuery({ name: 'lng', required: false })
  @ApiQuery({ name: 'radiusKm', required: false })
  @ApiQuery({ name: 'vehicleType', required: false })
  @ApiQuery({ name: 'maxTonnage', required: false })
  async getLoads(
    @Query('lat') lat?: number,
    @Query('lng') lng?: number,
    @Query('radiusKm') radiusKm?: number,
    @Query('vehicleType') vehicleType?: string,
    @Query('maxTonnage') maxTonnage?: number,
  ) {
    return this.service.getAvailableLoads({ lat, lng, radiusKm, vehicleType, maxTonnage });
  }

  @Post('loads/:id/accept')
  @ApiOperation({ summary: 'Yuku ustlen (Carrier API)' })
  async accept(@Param('id') id: string, @Body() dto: AcceptLoadDto, @Req() req: any) {
    return this.service.acceptLoad(id, req.user.id, dto);
  }

  @Patch('loads/:id/status')
  @ApiOperation({ summary: 'Yuk durumunu guncelle (state machine)' })
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto, @Req() req: any) {
    return this.service.updateStatus(id, req.user.id, dto);
  }

  @Get('loads/:id/history')
  @ApiOperation({ summary: 'Yuk durum gecmisi' })
  async getHistory(@Param('id') id: string) {
    return this.service.getStatusHistory(id);
  }
}
