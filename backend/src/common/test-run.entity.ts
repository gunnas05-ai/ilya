import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export type TestStatus = 'running' | 'passed' | 'failed' | 'error';
export type TestCategory = 'api' | 'e2e' | 'integration' | 'smoke' | 'security' | 'performance';

@Entity('test_runs')
export class TestRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 50, default: 'api' })
  category: TestCategory;

  @Column({ length: 20, default: 'running' })
  status: TestStatus;

  @Column({ default: 0 })
  totalTests: number;

  @Column({ default: 0 })
  passedTests: number;

  @Column({ default: 0 })
  failedTests: number;

  @Column({ type: 'float', nullable: true })
  durationSeconds: number;

  @Column({ nullable: true, type: 'text' })
  errorLog: string;

  @Column({ length: 50, nullable: true })
  triggeredBy: string; // 'manual' | 'scheduled' | 'auto'

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('test_results')
export class TestResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  testRunId: string;

  @Column({ length: 100 })
  testName: string;

  @Column({ length: 50 })
  module: string;

  @Column({ length: 20 })
  status: 'passed' | 'failed' | 'skipped';

  @Column({ type: 'float', default: 0 })
  durationMs: number;

  @Column({ nullable: true, type: 'text' })
  errorMessage: string;

  @Column({ nullable: true })
  screenshotUrl: string;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('system_health_logs')
export class SystemHealthLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  service: string; // 'api', 'database', 'redis', 'sms', 'email', 'payment', 'ws', 'gps'

  @Column({ length: 20 })
  status: 'healthy' | 'degraded' | 'down';

  @Column({ type: 'float', default: 0 })
  responseTimeMs: number;

  @Column({ nullable: true, type: 'text' })
  errorDetail: string;

  @CreateDateColumn()
  createdAt: Date;
}
