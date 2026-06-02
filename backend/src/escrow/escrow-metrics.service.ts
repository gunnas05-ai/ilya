import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectMetric, makeCounterProvider, makeHistogramProvider, makeGaugeProvider } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram, Gauge } from 'prom-client';

export const ESCROW_RELEASE_TIME = 'escrow_release_time_seconds';
export const QR_SCAN_TOTAL = 'qr_scan_total';
export const QR_SCAN_SUCCESS = 'qr_scan_success';
export const FRAUD_ALERT_TOTAL = 'fraud_alert_total';
export const FRAUD_RATIO = 'fraud_ratio';
export const DISPUTE_TOTAL = 'dispute_total';
export const ESCROW_RELEASE_TOTAL = 'escrow_release_total';
export const API_LATENCY = 'api_latency_seconds';
export const OUTBOX_QUEUE_DEPTH = 'outbox_queue_depth';

export const metricProviders = [
  makeHistogramProvider({ name: ESCROW_RELEASE_TIME, help: 'Escrow release time in seconds', buckets: [1, 5, 15, 30, 60, 120, 300] }),
  makeCounterProvider({ name: QR_SCAN_TOTAL, help: 'Total QR scan attempts' }),
  makeCounterProvider({ name: QR_SCAN_SUCCESS, help: 'Successful QR scans' }),
  makeCounterProvider({ name: FRAUD_ALERT_TOTAL, help: 'Total fraud alerts triggered' }),
  makeGaugeProvider({ name: FRAUD_RATIO, help: 'Fraud ratio (fraud_alerts / total_qr_scans) as percentage' }),
  makeCounterProvider({ name: DISPUTE_TOTAL, help: 'Total disputes opened', labelNames: ['reason'] }),
  makeCounterProvider({ name: ESCROW_RELEASE_TOTAL, help: 'Total escrow releases by tier', labelNames: ['tier'] }),
  makeHistogramProvider({ name: API_LATENCY, help: 'API request latency in seconds', buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5], labelNames: ['method', 'path'] }),
  makeGaugeProvider({ name: OUTBOX_QUEUE_DEPTH, help: 'Number of pending outbox events' }),
];

@Injectable()
export class EscrowMetricsService {
  private fraudAlertCount = 0;
  private qrScanCount = 0;

  constructor(
    @InjectMetric(ESCROW_RELEASE_TIME) private releaseTimeHistogram: Histogram<string>,
    @InjectMetric(QR_SCAN_TOTAL) private qrScanTotal: Counter<string>,
    @InjectMetric(QR_SCAN_SUCCESS) private qrScanSuccess: Counter<string>,
    @InjectMetric(FRAUD_ALERT_TOTAL) private fraudAlertTotal: Counter<string>,
    @InjectMetric(FRAUD_RATIO) private fraudRatio: Gauge<string>,
    @InjectMetric(DISPUTE_TOTAL) private disputeTotal: Counter<string>,
    @InjectMetric(ESCROW_RELEASE_TOTAL) private escrowReleaseTotal: Counter<string>,
    @InjectMetric(API_LATENCY) private apiLatencyHistogram: Histogram<string>,
    @InjectMetric(OUTBOX_QUEUE_DEPTH) private outboxQueueDepth: Gauge<string>,
  ) {}

  recordReleaseTime(seconds: number, tier: string) {
    this.releaseTimeHistogram.observe(seconds);
    this.escrowReleaseTotal.inc({ tier });
  }

  recordQrScan(success: boolean) {
    this.qrScanTotal.inc();
    this.qrScanCount++;
    if (success) this.qrScanSuccess.inc();
  }

  recordFraudAlert() {
    this.fraudAlertTotal.inc();
    this.fraudAlertCount++;
    const ratio = this.qrScanCount > 0 ? (this.fraudAlertCount / this.qrScanCount) * 100 : 0;
    this.fraudRatio.set(parseFloat(ratio.toFixed(2)));
  }

  recordDispute(reason: string) {
    this.disputeTotal.inc({ reason });
  }

  recordApiLatency(seconds: number, method: string, path: string) {
    this.apiLatencyHistogram.observe({ method, path }, seconds);
  }

  setOutboxQueueDepth(depth: number) {
    this.outboxQueueDepth.set(depth);
  }
}
