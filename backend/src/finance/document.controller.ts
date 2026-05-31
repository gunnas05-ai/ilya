import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DocumentService } from './document.service';
import { DocumentType } from './shipment-document.entity';

@Controller({ path: 'documents', version: '1' })
@UseGuards(AuthGuard('jwt'))
export class DocumentController {
  constructor(private readonly service: DocumentService) {}

  @Post('upload')
  async upload(@Body() body: { shipmentId?: string; documentType?: string; fileUrl: string; fileName?: string }) {
    return { data: await this.service.upload(body) };
  }

  @Post(':id/verify')
  async verify(@Param('id') id: string, @Body() body: { userId: string }) {
    return this.service.verify(id, body.userId);
  }

  @Post(':id/reject')
  async reject(@Param('id') id: string, @Body() body: { notes: string }) {
    return this.service.reject(id, body.notes);
  }

  @Get('shipment/:shipmentId')
  async getShipmentDocs(@Param('shipmentId') shipmentId: string) {
    return { data: await this.service.getShipmentDocs(shipmentId) };
  }

  @Get('missing/:shipmentId')
  async getMissing(@Param('shipmentId') shipmentId: string) {
    return { data: await this.service.getMissingDocs(shipmentId) };
  }

  @Get('dashboard')
  async dashboard() {
    return { data: await this.service.getDashboardSummary() };
  }

  @Get('all-status')
  async allStatus() {
    return { data: await this.service.getAllShipmentsStatus() };
  }
}
