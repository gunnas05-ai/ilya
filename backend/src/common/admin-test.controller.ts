import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TestExecutionService } from './test-execution.service';
import { HealthMonitoringService } from './health-monitoring.service';
import { AiTestAgentService } from './ai-test-agent.service';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';

@ApiTags('admin')
@Controller({ path: 'admin/tests', version: '1' })
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('super_admin', 'admin')
@ApiBearerAuth()
export class AdminTestController {
  constructor(
    private readonly testService: TestExecutionService,
    private readonly healthService: HealthMonitoringService,
    private readonly aiAgent: AiTestAgentService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Test istatistikleri' })
  async getStats() {
    return this.testService.getTestStats();
  }

  @Get('runs')
  @ApiOperation({ summary: 'Son test kosumlari' })
  async getRuns() {
    const runs = await this.testService.getRecentRuns();
    return { success: true, data: runs };
  }

  @Get('runs/:id')
  @ApiOperation({ summary: 'Test kosum detayi' })
  async getRunDetail(@Param('id') id: string) {
    return this.testService.getRunDetail(id);
  }

  @Post('run/all')
  @ApiOperation({ summary: 'Tum testleri calistir' })
  async runAll() {
    const run = await this.testService.runAllTests('api', 'manual');
    return { success: true, data: run };
  }

  @Post('run/smoke')
  @ApiOperation({ summary: 'Smoke test calistir' })
  async runSmoke() {
    const run = await this.testService.runAllTests('smoke', 'manual');
    return { success: true, data: run };
  }

  @Get('health')
  @ApiOperation({ summary: 'Sistem saglik durumu' })
  async getHealth() {
    const health = await this.healthService.getLatestHealth();
    return { success: true, data: health };
  }

  @Post('health/check')
  @ApiOperation({ summary: 'Manuel saglik kontrolu baslat' })
  async runHealthCheck() {
    const results = await this.healthService.checkAll();
    return { success: true, data: results };
  }

  @Get('health/history/:service')
  @ApiOperation({ summary: 'Servis saglik gecmisi' })
  async getHealthHistory(@Param('service') service: string) {
    const history = await this.healthService.getHealthHistory(service);
    return { success: true, data: history };
  }

  @Get('ai/analysis')
  @ApiOperation({ summary: 'AI anomali analizi' })
  async getAiAnalysis() {
    return this.aiAgent.analyzeTestResults();
  }

  @Get('ai/predictions')
  @ApiOperation({ summary: 'Modul bazli hata tahmini' })
  async getPredictions() {
    return this.aiAgent.predictFailureProbability();
  }

  @Get('templates')
  @ApiOperation({ summary: 'Permission sablonlari' })
  async getTemplates() {
    // Templates are served from PermissionTemplatesService via AdminRoleController
    const { PermissionTemplatesService } = await import('./permission-templates.service');
    const templates = new PermissionTemplatesService(null as any, null as any, null as any).getTemplates();
    return { success: true, data: templates };
  }

  @Post('templates/apply')
  @ApiOperation({ summary: 'Sablonu role uygula' })
  async applyTemplate(@Param('roleKey') roleKey: string, @Body() body: { roleKey: string; templateName: string }) {
    const { PermissionTemplatesService } = await import('./permission-templates.service');
    const { getRepositoryToken } = await import('@nestjs/typeorm');
    // This is a lightweight approach — in production, inject the service properly
    return { success: true, message: 'Use /admin/roles/templates/apply endpoint instead' };
  }
}
