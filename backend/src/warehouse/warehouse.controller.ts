import { Controller, Post, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WarehouseService } from './warehouse.service';

@ApiTags('warehouse')
@Controller({ path: 'warehouse', version: '1' })
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class WarehouseController {
  constructor(private readonly service: WarehouseService) {}

  @Post('appointment')
  @ApiOperation({ summary: 'Yukleme/bosaltma randevusu talep et' })
  async requestAppointment(@Body() body: { warehouseId: string; loadId: string; vehiclePlate: string; requestedDate: string; dockType?: string }) {
    return this.service.requestAppointment(body);
  }

  @Get('docks/:warehouseId')
  @ApiOperation({ summary: 'Depo rampalarini listele' })
  async getDocks(@Param('warehouseId') warehouseId: string) {
    return this.service.getDocks(warehouseId);
  }

  @Patch('appointment/:id')
  @ApiOperation({ summary: 'Randevuyu guncelle / iptal et' })
  async updateAppointment(@Param('id') id: string, @Body() body: { status?: string; dockId?: string; notes?: string }) {
    return this.service.updateAppointment(id, body);
  }
}
