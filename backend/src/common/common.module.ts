import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Permission } from './permission.entity';
import { Role } from './role.entity';
import { RolePermission } from './role-permission.entity';
import { TestRun, TestResult, SystemHealthLog } from './test-run.entity';
import { City } from './city.entity';
import { District } from './district.entity';
import { SystemSetting } from './system-setting.entity';
import { DriverFeedPost, DriverFeedComment, RoadReport } from './driver-feed.entity';
import { RolesGuard } from './roles.guard';
import { LanguageService } from './language.service';
import { LanguageController } from './language.controller';
import { CommunityService } from './community.service';
import { CommunityController } from './community.controller';
import { WhatsAppSettings } from './whatsapp-settings.entity';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppController } from './whatsapp.controller';
import { MessageBusService } from './message-bus.service';
import { StructuredLogger } from './structured-logger.service';
import { HealthController } from './health.controller';
import { AdminTestController } from './admin-test.controller';
import { TestExecutionService } from './test-execution.service';
import { HealthMonitoringService } from './health-monitoring.service';
import { ScheduledTestService } from './scheduled-test.service';
import { LoadsV2Controller, LoadsV1DeprecatedController } from './versioning-example.controller';
import { SozlesmeController } from './sozlesme.controller';
import { KafkaModule } from './kafka/kafka.module';
import { VaultConfigService } from './vault/vault.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Permission, Role, RolePermission, TestRun, TestResult, SystemHealthLog, City, District, WhatsAppSettings, SystemSetting, DriverFeedPost, DriverFeedComment, RoadReport]),
    KafkaModule.forRootAsync(),
  ],
  controllers: [WhatsAppController, LanguageController, CommunityController, HealthController, AdminTestController, LoadsV2Controller, LoadsV1DeprecatedController, SozlesmeController],
  providers: [WhatsAppService, RolesGuard, LanguageService, CommunityService, MessageBusService, StructuredLogger, VaultConfigService, TestExecutionService, HealthMonitoringService, ScheduledTestService],
  exports: [WhatsAppService, TypeOrmModule, RolesGuard, LanguageService, CommunityService, MessageBusService, StructuredLogger, VaultConfigService, TestExecutionService, HealthMonitoringService],
})
export class CommonModule {}
