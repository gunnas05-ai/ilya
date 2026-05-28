import * as dotenv from 'dotenv';
dotenv.config();
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './websocket/redis-io.adapter';
import { join } from 'path';
import { startTracing } from './common/telemetry/tracing';

async function bootstrap() {
  // OpenTelemetry — diger her seyden once baslat
  await startTracing();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/uploads' });

  // CORS: allowlist-based origin kontrolü
  const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:8081')
    .split(',')
    .map((o) => o.trim());

  app.enableCors({
    origin: (origin, callback) => {
      // Non-browser requests (mobile apps, curl) — allow
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-device-fingerprint', 'Accept-Version'],
    credentials: true,
  });

  // EX-029: API Versioning — URI + Header + Media Type
  app.enableVersioning({
    type: VersioningType.URI,
    prefix: 'v',
    defaultVersion: '1',
  });

  // EX-011: Redis-backed WebSocket adapter for horizontal scaling
  const redisAdapter = new RedisIoAdapter(app);
  await redisAdapter.connectToRedis();
  app.useWebSocketAdapter(redisAdapter);

  // API prefix (version is handled by NestJS URI versioning above)
  app.setGlobalPrefix('api');

  // EX-012: Swagger / OpenAPI documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('KAPTAN Lojistik Platform API')
    .setDescription(
      'Enterprise-grade dijital karayolu yük taşımacılığı platformu.\n\n' +
      '**Modüller:** Yük Yönetimi, Teklif/Açık Artırma, Canlı Takip, ePOD, ' +
      'Escrow Güvenli Ödeme, e-Fatura/e-Arşiv (GİB), Finans, Akaryakıt, Restoran, ' +
      'Araç Pazaryeri, Webhook & API Key Yönetimi\n\n' +
      '**Authentication:** JWT Bearer token (`Authorization: Bearer <token>`)\n' +
      '**API Key:** `X-API-Key: kpt_...` header ile de kullanılabilir'
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' }, 'api-key')
    .addTag('auth', 'Kimlik Doğrulama')
    .addTag('loads', 'Yük Yönetimi')
    .addTag('bids', 'Teklif Sistemi')
    .addTag('tracking', 'Canlı Takip')
    .addTag('pod', 'ePOD Teslimat Kanıtı')
    .addTag('escrow', 'Güvenli Ödeme & Cüzdan')
    .addTag('invoice', 'e-Fatura / e-Arşiv (GİB)')
    .addTag('finance', 'Gelir-Gider & Muhasebe')
    .addTag('fuel-stations', 'Akaryakıt İstasyonları')
    .addTag('restaurants', 'Yol Üstü Tesisler')
    .addTag('marketplace', 'Araç & Ekipman Pazaryeri')
    .addTag('integrations', 'Webhook & API Key')
    .addTag('analytics', 'İş Zekası & Raporlama')
    .addTag('routing', 'Kamyon Navigasyon')
    .addTag('notifications', 'Bildirimler')
    .addTag('shipper-api', 'Shipper API (Gönderici Entegrasyonu)')
    .addTag('carrier-api', 'Carrier API (Taşıyıcı Entegrasyonu)')
    .addTag('rate-api', 'Rate API (Fiyatlandırma Motoru)')
    .addTag('warehouse', 'Depo Entegrasyonu')
    .addTag('customs', 'Gümrük Entegrasyonu')
    .addTag('erp', 'ERP Entegrasyonları')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'KAPTAN API Dokümantasyonu',
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
  console.log(`📘 API Docs: http://localhost:${process.env.PORT || 3000}/api/docs`);

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 KAPTAN Backend running on http://localhost:${port}`);
  console.log(`📡 WebSocket ready on ws://localhost:${port}/ws`);
}
bootstrap();
