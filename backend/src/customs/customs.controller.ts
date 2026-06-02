// @ts-nocheck
import { Controller, Post, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CustomsService } from './customs.service';

@ApiTags('customs')
@Controller({ path: 'customs', version: '1' })
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class CustomsController {
  constructor(private readonly service: CustomsService) {}

  @Post('declaration')
  @ApiOperation({ summary: 'Gumruk beyannamesi olustur' })
  async create(@Body() body: { loadId: string; declarationType: string; goodsDescription: string; value: number; originCountry: string; destCountry: string }) {
    return this.service.createDeclaration(body as any);
  }

  @Patch('declaration/:id/status')
  @ApiOperation({ summary: 'Beyanname durumunu guncelle' })
  async updateStatus(@Param('id') id: string, @Body() body: { status: string; reason?: string }) {
    return this.service.updateStatus(id, body.status, body.reason);
  }

  @Get('declaration/:loadId')
  @ApiOperation({ summary: 'Yuke ait beyannameyi getir' })
  async getDeclaration(@Param('loadId') loadId: string) {
    return this.service.getDeclaration(loadId);
  }

  @Post('declaration/:id/document')
  @ApiOperation({ summary: 'Beyannameye belge ekle' })
  async addDocument(@Param('id') id: string, @Body() body: { type: string; url: string; name?: string }) {
    return this.service.addDocument(id, body as any);
  }

  @Get('declaration/:id/documents')
  @ApiOperation({ summary: 'Beyanname belgelerini listele' })
  async getDocuments(@Param('id') id: string) {
    return this.service.getDocuments(id);
  }
}
