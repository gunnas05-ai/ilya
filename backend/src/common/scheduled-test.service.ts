import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TestExecutionService } from './test-execution.service';
import { HealthMonitoringService } from './health-monitoring.service';

@Injectable()
export class ScheduledTestService {
  private readonly logger = new Logger(ScheduledTestService.name);

  constructor(
    private readonly testService: TestExecutionService,
    private readonly healthService: HealthMonitoringService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async runApiHealthCheck() {
    this.logger.log('Scheduled: API health check (5dk)');
    await this.healthService.checkApiHealth().catch(() => {});
  }

  @Cron('*/15 * * * *') // Her 15 dakikada bir
  async runLoginTest() {
    this.logger.log('Scheduled: Login test (15dk)');
    await this.healthService.checkAll().catch(() => {});
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async runSmokeTests() {
    this.logger.log('Scheduled: Smoke tests (30dk)');
    await this.testService.runAllTests('smoke', 'scheduled').catch(() => {});
  }

  @Cron('0 0 * * *') // Her gun gece yarisi
  async runDailyRegression() {
    this.logger.log('Scheduled: Daily regression');
    await this.testService.runAllTests('api', 'scheduled').catch(() => {});
  }

  @Cron('0 0 * * 0') // Her Pazar gece yarisi
  async runWeeklyFullTest() {
    this.logger.log('Scheduled: Weekly full system test');
    await this.healthService.checkAll().catch(() => {});
    await this.testService.runAllTests('api', 'scheduled').catch(() => {});
  }
}
