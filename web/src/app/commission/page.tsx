'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface CommissionConfig {
  id: string;
  name: string;
  displayName: string;
  rate: number;
  description: string;
  isActive: boolean;
}

export default function CommissionPage() {
  const [configs, setConfigs] = useState<CommissionConfig[]>([]);
  const [report, setReport] = useState<any>(null);
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/billing/commission/configs').catch(() => ({ data: { data: [] } })),
      api.get(`/billing/commission/report?period=${period}`).catch(() => ({ data: { data: null } })),
    ]).then(([configsRes, reportRes]) => {
      setConfigs(configsRes.data?.data || []);
      setReport(reportRes.data?.data || null);
      setLoading(false);
    });
  }, [period]);

  const configLabels: Record<string, string> = {
    platform_match: 'Platform Eşleşme',
    own_carrier: 'Kendi Taşıyıcısı',
    escrow_acceleration: 'Escrow Hızlandırma',
    insurance: 'Sigorta',
    fuel_card: 'Akaryakıt Kartı',
    early_payment: 'Erken Ödeme',
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-kaptan-text mb-6">Komisyon Yönetimi</h2>

      {loading ? (
        <div className="space-y-4">{[1,2].map(i => <div key={i} className="h-32 skeleton rounded-xl" />)}</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Komisyon Oranları */}
          <div className="glass-card p-5">
            <h3 className="text-lg font-semibold text-kaptan-text mb-4">Komisyon Oranları</h3>
            <div className="space-y-3">
              {Object.entries(configLabels).map(([key, label]) => {
                const config = configs.find((c) => c.name === key);
                const rate = config?.rate || 0;
                return (
                  <div key={key} className="bg-kaptan-dark rounded-lg p-3 border border-kaptan-border flex items-center justify-between">
                    <span className="text-sm text-kaptan-text">{label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-kaptan-primary font-bold text-lg">%{rate}</span>
                      {config?.isActive === false && <span className="text-xs text-kaptan-danger">Pasif</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Komisyon Raporu */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-kaptan-text">Komisyon Raporu</h3>
              <select
                className="bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-1.5 text-sm text-kaptan-text"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                <option value="today">Bugün</option>
                <option value="week">Bu Hafta</option>
                <option value="month">Bu Ay</option>
                <option value="year">Bu Yıl</option>
              </select>
            </div>
            {report ? (
              <>
                <div className="text-3xl font-bold text-kaptan-success mb-2">{report.totalCommissionTL} ₺</div>
                <div className="text-sm text-kaptan-muted mb-4">{report.totalTransactions} işlem</div>
                {report.dailyBreakdown && report.dailyBreakdown.length > 0 && (
                  <div className="space-y-1 max-h-48 overflow-auto">
                    {report.dailyBreakdown.map((d: any) => (
                      <div key={d.date} className="flex justify-between text-xs text-kaptan-muted py-1 border-b border-kaptan-border/30">
                        <span>{d.date}</span>
                        <span className="text-kaptan-text font-medium">{d.amountTL} ₺</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-kaptan-muted text-sm">Henüz komisyon verisi bulunmuyor.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
