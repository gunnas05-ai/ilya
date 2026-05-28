import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WebhookService } from './webhook.service';
import { ApiKeyService } from './api-key.service';

@Controller('integrations')
@UseGuards(AuthGuard('jwt'))
export class IntegrationsController {
  constructor(
    private webhookService: WebhookService,
    private apiKeyService: ApiKeyService,
  ) {}

  // ── Webhooks ─────────────────────────────────────────

  @Post('webhooks')
  async createWebhook(
    @Body() body: { url: string; name: string; events: string[]; secret?: string },
    @Req() req: any,
  ) {
    return this.webhookService.create({ ...body, userId: req.user.id });
  }

  @Get('webhooks')
  async listWebhooks(@Req() req: any) {
    return this.webhookService.findAll(req.user.id);
  }

  @Get('webhooks/:id')
  async getWebhook(@Param('id') id: string, @Req() req: any) {
    return this.webhookService.findById(id, req.user.id);
  }

  @Put('webhooks/:id')
  async updateWebhook(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.webhookService.update(id, req.user.id, body);
  }

  @Delete('webhooks/:id')
  async deleteWebhook(@Param('id') id: string, @Req() req: any) {
    return this.webhookService.delete(id, req.user.id);
  }

  @Post('webhooks/:id/toggle')
  async toggleWebhook(@Param('id') id: string, @Req() req: any) {
    return this.webhookService.toggleActive(id, req.user.id);
  }

  // ── API Keys ─────────────────────────────────────────

  @Post('api-keys')
  async generateApiKey(
    @Body() body: { name: string; permissions?: string[]; rateLimitPerHour?: number },
    @Req() req: any,
  ) {
    return this.apiKeyService.generate({ ...body, userId: req.user.id });
  }

  @Get('api-keys')
  async listApiKeys(@Req() req: any) {
    return this.apiKeyService.findAll(req.user.id);
  }

  @Post('api-keys/:id/revoke')
  async revokeApiKey(@Param('id') id: string, @Req() req: any) {
    return this.apiKeyService.revoke(id, req.user.id);
  }

  @Delete('api-keys/:id')
  async deleteApiKey(@Param('id') id: string, @Req() req: any) {
    return this.apiKeyService.delete(id, req.user.id);
  }
}
