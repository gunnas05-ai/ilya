import { Module, ValidationPipe } from '@nestjs/common';
import { APP_PIPE, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { RateLimitGuard } from './common/rate-limit.guard';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { CacheModule } from '@nestjs/cache-manager';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { LoadsModule } from './loads/loads.module';
import { BidsModule } from './bids/bids.module';
import { TrackingModule } from './tracking/tracking.module';
import { EscrowModule } from './escrow/escrow.module';
import { NotificationsModule } from './notifications/notifications.module';
import { QrModule } from './qr/qr.module';
import { ReturnLoadsModule } from './return-loads/return-loads.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { WebSocketModule } from './websocket/websocket.module';
import { TransformInterceptor } from './common/transform.interceptor';
import { ApiLatencyInterceptor } from './common/api-latency.interceptor';
import { DeprecationInterceptor } from './common/deprecation.interceptor';
import { GibModule } from './gib/gib.module';
import { FinanceModule } from './finance/finance.module';
import { FuelStationsModule } from './fuel-stations/fuel-stations.module';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { UetdsModule } from './uetds/uetds.module';
import { PodModule } from './pod/pod.module';
import { RoutingModule } from './routing/routing.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { ShipperApiModule } from './shipper-api/shipper-api.module';
import { CarrierApiModule } from './carrier-api/carrier-api.module';
import { RateApiModule } from './rate-api/rate-api.module';
import { ErpIntegrationModule } from './erp-integration/erp-integration.module';
import { WarehouseModule } from './warehouse/warehouse.module';
import { CustomsModule } from './customs/customs.module';
import { PaymentModule } from './payment/payment.module';
import { BillingModule } from './billing/billing.module';
import { PaymentCoreModule } from './payment-core/payment-core.module';
import { PartMarketModule } from './part-market/part-market.module';
import { ChatModule } from './chat/chat.module';
import { VoiceModule } from './voice/voice.module';
import { RateIntelligenceModule } from './rate-intelligence/rate-intelligence.module';
import { InstantBookingModule } from './instant-booking/instant-booking.module';
import { AiMatchingModule } from './ai-matching/ai-matching.module';
import { AutomatedReloadsModule } from './automated-reloads/automated-reloads.module';
import { TaxModule } from './tax/tax.module';

const isProduction = process.env.NODE_ENV === 'production';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 1000, limit: 5 }]),
    CacheModule.register({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    PrometheusModule.register({
      defaultMetrics: {
        enabled: true,
      },
    }),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: 6379,
      },
    }),
    BullModule.registerQueue({
      name: 'invoice-processing',
    }),
    TypeOrmModule.forRootAsync({
      useFactory: async () => {
        const { getDatabaseConfig } = await import('./database-config');
        return getDatabaseConfig();
      },
    }),
    ScheduleModule.forRoot(),
    CommonModule,
    AuthModule,
    UsersModule,
    LoadsModule,
    BidsModule,
    TrackingModule,
    EscrowModule,
    NotificationsModule,
    QrModule,
    ReturnLoadsModule,
    AnalyticsModule,
    WebSocketModule,
    GibModule,
    FinanceModule,
    FuelStationsModule,
    RestaurantsModule,
    AnnouncementsModule,
    UetdsModule,
    PodModule,
    RoutingModule,
    IntegrationsModule,
    MarketplaceModule,
    VehiclesModule,
    ShipperApiModule,
    CarrierApiModule,
    RateApiModule,
    ErpIntegrationModule,
    WarehouseModule,
    CustomsModule,
    PaymentModule,
    BillingModule,
    PartMarketModule,
    ChatModule,
    VoiceModule,
    RateIntelligenceModule,
    InstantBookingModule,
    AiMatchingModule,
    AutomatedReloadsModule,
    PaymentCoreModule,
    TaxModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
    {
      provide: APP_PIPE,
      useFactory: () => new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: isProduction, // Production'da bilinmeyen alanlari reddet
        disableErrorMessages: isProduction,
      }),
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ApiLatencyInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: DeprecationInterceptor,
    },
  ],
})
export class AppModule {}
