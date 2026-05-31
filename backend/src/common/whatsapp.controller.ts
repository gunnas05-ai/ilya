import { Controller, Get, Put, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { WhatsAppService } from './whatsapp.service';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';

@ApiTags('admin')
@Controller({ path: 'admin/whatsapp', version: '1' })
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('super_admin', 'admin')
@ApiBearerAuth()
export class WhatsAppController {
  constructor(private readonly service: WhatsAppService) {}

  @Get('settings')
  async getSettings() {
    return { data: await this.service.getSettings() };
  }

  @Put('settings')
  async updateSettings(@Body() body: { apiKey?: string; phoneNumberId?: string; businessAccountId?: string; webhookVerifyToken?: string; isActive?: boolean }) {
    return { data: await this.service.updateSettings(body) };
  }

  @Post('test')
  async sendTest(@Body() body: { phone: string }) {
    return this.service.sendTestMessage(body.phone);
  }
}
