import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TestResult, SystemHealthLog } from './test-run.entity';

interface AnomalyReport {
  hasAnomalies: boolean;
  anomalies: string[];
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
}

@Injectable()
export class AiTestAgentService {
  private readonly logger = new Logger(AiTestAgentService.name);

  constructor(
    @InjectRepository(TestResult) private resultRepo: Repository<TestResult>,
    @InjectRepository(SystemHealthLog) private healthRepo: Repository<SystemHealthLog>,
  ) {}

  async analyzeTestResults(): Promise<AnomalyReport> {
    const anomalies: string[] = [];
    const recommendations: string[] = [];

    // 1. Son 50 test sonucunu analiz et
    const recentResults = await this.resultRepo.find({
      order: { createdAt: 'DESC' },
      take: 50,
    });

    if (recentResults.length === 0) {
      return { hasAnomalies: false, anomalies: [], riskLevel: 'low', recommendations: ['Henuz yeterli test verisi yok. Birkac test kosumu yapin.'] };
    }

    const failRate = recentResults.filter((r) => r.status === 'failed').length / recentResults.length;

    // Anomali: %30'un uzerinde basarisizlik
    if (failRate > 0.3) {
      anomalies.push(`Yuksek basarisizlik orani: ${(failRate * 100).toFixed(1)}%`);
      recommendations.push('Kritik modulleri kontrol edin: auth, api, loads');
    }

    // Anomali: Ayni test surekli basarisiz
    const failCounts: Record<string, number> = {};
    for (const r of recentResults.filter((r) => r.status === 'failed')) {
      failCounts[r.testName] = (failCounts[r.testName] || 0) + 1;
    }
    for (const [name, count] of Object.entries(failCounts)) {
      if (count >= 5) {
        anomalies.push(`"${name}" testi son 50 kosumda ${count} kez basarisiz oldu`);
        recommendations.push(`"${name}" testini manuel inceleyin, bagimli servisleri kontrol edin`);
      }
    }

    // 2. Sistem sagligi analizi
    const healthLogs = await this.healthRepo.find({ order: { createdAt: 'DESC' }, take: 20 });
    const degradedCount = healthLogs.filter((h) => h.status !== 'healthy').length;
    if (degradedCount > 5) {
      anomalies.push(`Sistem sagliginda bozulma: son 20 kontrolde ${degradedCount} sagliksiz`);
      recommendations.push('Sistem kaynaklarini kontrol edin (CPU, RAM, Disk)');
    }

    // 3. Performans trend analizi
    const avgResponseTime = recentResults.reduce((sum, r) => sum + (r.durationMs || 0), 0) / recentResults.length;
    if (avgResponseTime > 500) {
      anomalies.push(`Ortalama yanit suresi yuksek: ${avgResponseTime.toFixed(0)}ms`);
      recommendations.push('API optimizasyonu veya cache stratejisi gozden gecirin');
    }

    const riskLevel = anomalies.length >= 3 ? 'high' : anomalies.length >= 1 ? 'medium' : 'low';

    return { hasAnomalies: anomalies.length > 0, anomalies, riskLevel, recommendations };
  }

  async predictFailureProbability(): Promise<{ module: string; probability: number }[]> {
    const recentResults = await this.resultRepo.find({
      order: { createdAt: 'DESC' },
      take: 100,
    });

    const moduleStats: Record<string, { total: number; failed: number }> = {};
    for (const r of recentResults) {
      if (!moduleStats[r.module]) moduleStats[r.module] = { total: 0, failed: 0 };
      moduleStats[r.module].total++;
      if (r.status === 'failed') moduleStats[r.module].failed++;
    }

    return Object.entries(moduleStats)
      .map(([module, stats]) => ({
        module,
        probability: stats.total > 0 ? stats.failed / stats.total : 0,
      }))
      .sort((a, b) => b.probability - a.probability);
  }
}
