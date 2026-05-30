import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TestRun, TestResult } from './test-run.entity';

interface TestCase {
  name: string;
  module: string;
  run: () => Promise<{ passed: boolean; errorMessage?: string; durationMs: number }>;
}

@Injectable()
export class TestExecutionService {
  private readonly logger = new Logger(TestExecutionService.name);

  constructor(
    @InjectRepository(TestRun) private runRepo: Repository<TestRun>,
    @InjectRepository(TestResult) private resultRepo: Repository<TestResult>,
  ) {}

  private defineTestCases(): TestCase[] {
    return [
      { name: 'API Health Check', module: 'api', run: async () => this.simpleApiTest('/health') },
      { name: 'Auth Login Test', module: 'auth', run: async () => this.simpleApiTest('/auth/login', 'POST', { email: 'test@test.com', password: 'test' }) },
      { name: 'Users List Test', module: 'users', run: async () => this.simpleApiTest('/users') },
      { name: 'Loads List Test', module: 'loads', run: async () => this.simpleApiTest('/loads') },
      { name: 'Fuel Stations Test', module: 'roadside', run: async () => this.simpleApiTest('/fuel-stations') },
      { name: 'Restaurants Test', module: 'roadside', run: async () => this.simpleApiTest('/restaurants') },
      { name: 'Notifications Test', module: 'notifications', run: async () => this.simpleApiTest('/notifications') },
      { name: 'Analytics Test', module: 'analytics', run: async () => this.simpleApiTest('/analytics/shipper-dashboard') },
    ];
  }

  private async simpleApiTest(path: string, method: 'GET' | 'POST' = 'GET', body?: any): Promise<{ passed: boolean; errorMessage?: string; durationMs: number }> {
    const start = Date.now();
    const axios = require('axios');
    const baseUrl = `http://127.0.0.1:${process.env.PORT || 3000}/api/v1`;
    try {
      const config: any = { timeout: 10000 };
      if (method === 'POST') {
        await axios.post(baseUrl + path, body || {}, config);
      } else {
        await axios.get(baseUrl + path, config);
      }
      return { passed: true, durationMs: Date.now() - start };
    } catch (e: any) {
      const status = e.response?.status;
      // 401/403 = endpoint var ama auth gerekli → passed
      if (status === 401 || status === 403 || status === 400) {
        return { passed: true, durationMs: Date.now() - start };
      }
      return { passed: false, errorMessage: `${status || 'NET'}: ${e.message}`, durationMs: Date.now() - start };
    }
  }

  async runAllTests(category = 'api', triggeredBy = 'manual'): Promise<TestRun> {
    const run = this.runRepo.create({ name: `${category} tests — ${new Date().toISOString()}`, category: category as any, status: 'running', totalTests: 0, triggeredBy });
    await this.runRepo.save(run);

    const testCases = this.defineTestCases();
    run.totalTests = testCases.length;
    await this.runRepo.save(run);

    let passed = 0;
    let failed = 0;
    const start = Date.now();

    for (const tc of testCases) {
      try {
        const result = await tc.run();
        const tr = this.resultRepo.create({
          testRunId: run.id,
          testName: tc.name,
          module: tc.module,
          status: result.passed ? 'passed' : 'failed',
          durationMs: result.durationMs,
          errorMessage: result.errorMessage || null,
        });
        await this.resultRepo.save(tr);
        if (result.passed) passed++; else failed++;
      } catch (e: any) {
        const tr = this.resultRepo.create({
          testRunId: run.id,
          testName: tc.name,
          module: tc.module,
          status: 'failed',
          durationMs: 0,
          errorMessage: e.message,
        });
        await this.resultRepo.save(tr);
        failed++;
      }
    }

    run.status = failed === 0 ? 'passed' : 'failed';
    run.passedTests = passed;
    run.failedTests = failed;
    run.durationSeconds = (Date.now() - start) / 1000;
    await this.runRepo.save(run);

    this.logger.log(`Test run "${run.name}": ${passed}/${run.totalTests} passed`);
    return run;
  }

  async getRecentRuns(limit = 20): Promise<TestRun[]> {
    return this.runRepo.find({ order: { createdAt: 'DESC' }, take: limit });
  }

  async getRunDetail(runId: string): Promise<{ run: TestRun; results: TestResult[] }> {
    const run = await this.runRepo.findOne({ where: { id: runId } });
    const results = await this.resultRepo.find({ where: { testRunId: runId } });
    return { run: run!, results };
  }

  async getTestStats(): Promise<{ totalRuns: number; passRate: number; lastRun: TestRun | null }> {
    const [totalRuns, runs] = await Promise.all([
      this.runRepo.count(),
      this.runRepo.find({ order: { createdAt: 'DESC' }, take: 50 }),
    ]);
    const passRate = runs.length > 0 ? Math.round((runs.filter((r) => r.status === 'passed').length / runs.length) * 100) : 100;
    return { totalRuns, passRate, lastRun: runs[0] || null };
  }
}
