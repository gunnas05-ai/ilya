import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Webhook } from './webhook.entity';
import { ApiKey } from './api-key.entity';
import { WebhookService } from './webhook.service';
import { ApiKeyService } from './api-key.service';
import { IntegrationsController } from './integrations.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Webhook, ApiKey]),
    ScheduleModule,
  ],
  controllers: [IntegrationsController],
  providers: [WebhookService, ApiKeyService],
  exports: [WebhookService, ApiKeyService],
})
export class IntegrationsModule {}
