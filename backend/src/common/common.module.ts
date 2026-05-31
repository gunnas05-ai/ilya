import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Permission } from './permission.entity';
import { Role } from './role.entity';
import { RolePermission } from './role-permission.entity';
import { TestRun, TestResult, SystemHealthLog } from './test-run.entity';
import { AdminAuditLog, SecurityEvent } from './admin-audit.entity';
import { City } from './city.entity';
import { District } from './district.entity';
import { RolesGuard } from './roles.guard';
import { MessageBusService } from './message-bus.service';
import { StructuredLogger } from './structured-logger.service';
import { AdminTestController } from './admin-test.controller';
import { AdminSecurityController } from './admin-security.controller';
import { TestExecutionService } from './test-execution.service';
import { AuditService } from './audit.service';
import { HealthMonitoringService } from './health-monitoring.service';
import { ScheduledTestService } from './scheduled-test.service';
import { AiTestAgentService } from './ai-test-agent.service';
import { PermissionTemplatesService } from './permission-templates.service';
import { KafkaModule } from './kafka/kafka.module';
import { VaultConfigService } from './vault/vault.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Permission, Role, RolePermission, TestRun, TestResult, SystemHealthLog, AdminAuditLog, SecurityEvent, City, District]),
    KafkaModule.forRootAsync(),
  ],
  controllers: [AdminTestController, AdminSecurityController],
  providers: [RolesGuard, MessageBusService, StructuredLogger, VaultConfigService, TestExecutionService, HealthMonitoringService, ScheduledTestService, AuditService, AiTestAgentService, PermissionTemplatesService],
  exports: [TypeOrmModule, RolesGuard, MessageBusService, StructuredLogger, VaultConfigService, TestExecutionService, HealthMonitoringService, AuditService, AiTestAgentService, PermissionTemplatesService],
})
export class CommonModule {}
