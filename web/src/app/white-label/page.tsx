'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Palette, Globe, Plus } from 'lucide-react';

export default function WhiteLabelPage() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // White-label config'leri çek (şimdilik boş olabilir)
    api.get('/billing/commission/configs').then(() => {
      setConfigs([]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Palette size={24} className="text-kaptan-primary" />
          <h2 className="text-2xl font-bold text-kaptan-text">Beyaz Etiket (White Label)</h2>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-kaptan-primary text-white rounded-lg text-sm font-medium">
          <Plus size={16} /> Yeni Beyaz Etiket
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-20 skeleton rounded-xl" />)}</div>
      ) : configs.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Palette size={48} className="mx-auto mb-4 text-kaptan-muted opacity-50" />
          <h3 className="text-lg font-semibold text-kaptan-text mb-2">Henüz Beyaz Etiket Müşterisi Yok</h3>
          <p className="text-kaptan-muted text-sm mb-6 max-w-md mx-auto">
            Kurumsal müşterilere kendi markalarıyla KAPTAN platformunu sunun.
            Setup: 50,000-100,000 TL, Aylık: 9,900 TL
          </p>
          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto text-left">
            {[
              { label: 'Kurulum', value: '50,000 - 100,000 TL' },
              { label: 'Aylık Lisans', value: '9,900 TL/ay' },
              { label: 'Kapsam', value: 'Kendi domain, logo, renk' },
              { label: 'API Erişimi', value: 'Tam API + Webhook' },
              { label: 'SLA', value: '%99.9 uptime' },
              { label: 'Destek', value: '7/24 öncelikli' },
            ].map((item) => (
              <div key={item.label} className="bg-kaptan-dark rounded-lg p-3 border border-kaptan-border">
                <div className="text-xs text-kaptan-muted">{item.label}</div>
                <div className="text-sm text-kaptan-text font-medium mt-1">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {configs.map((c: any) => (
            <div key={c.id} className="glass-card p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold" style={{ backgroundColor: c.primaryColor }}>
                  {c.companyName?.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="text-kaptan-text font-semibold flex items-center gap-2">
                    {c.companyName} {c.domain && <Globe size={14} className="text-kaptan-muted" />}
                  </div>
                  <div className="text-xs text-kaptan-muted">{c.domain || 'Domain atanmamış'} • {c.status}</div>
                </div>
                <div className="text-right">
                  <div className="text-kaptan-primary font-bold">{c.monthlyFee?.toLocaleString('tr-TR')}₺/ay</div>
                  <div className="text-xs text-kaptan-muted">Kurulum: {c.setupFee?.toLocaleString('tr-TR')}₺</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
