import { Controller, Get, Put, Post, Body } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';

@Controller({ path: 'admin/whatsapp', version: '1' })
export class WhatsAppController {
  constructor(private readonly service: WhatsAppService) {}

  @Get('settings')
  async getSettings() {
    return { data: await this.service.getSettings() };
  }

  @Put('settings')
  async updateSettings(@Body() body: any) {
    return { data: await this.service.updateSettings(body) };
  }

  @Post('test')
  async sendTest(@Body() body: { phone: string }) {
    return this.service.sendTestMessage(body.phone);
  }
}
