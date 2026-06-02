'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { FileText, Download, TrendingUp, Calendar, FileSpreadsheet } from 'lucide-react';

const REPORT_TYPES = [
  { key: 'monthly', label: 'Aylık Operasyon Raporu', desc: 'Yük, teklif, ciro, gider özeti', icon: Calendar },
  { key: 'annual', label: 'Yıllık Finansal Rapor', desc: 'Gelir-gider, KDV, vergi özeti', icon: TrendingUp },
  { key: 'tax', label: 'Vergi Raporu', desc: 'KDV, tevkifat, SGK dökümü', icon: FileText },
];

export default function ReportsPage() {
  const [period, setPeriod] = useState('month');
  const [exporting, setExporting] = useState<string | null>(null);
  const [csvData, setCsvData] = useState<any>(null);
  const [preview, setPreview] = useState<any[]>([]);

  const handleExport = async (type: string) => {
    setExporting(type);
    try {
      if (type === 'csv') {
        const r = await api.get(`/analytics/export?type=${period}`);
        setCsvData(r.data?.data || r.data);
        const rows = (r.data?.data || r.data || '').toString().split('\n').filter(Boolean);
        setPreview(rows.slice(0, 10).map((line: string) => line.split(',')));
      } else {
        const r = await api.get(`/analytics/export?type=${type}&period=${period}`);
        window.open(`/api/v1/analytics/export?type=${type}&period=${period}`, '_blank');
      }
    } catch { alert('Export başarısız'); }
    setExporting(null);
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-kaptan-text flex items-center gap-2"><FileSpreadsheet size={28} className="text-kaptan-primary" /> Raporlar & Export</h1>

      <div className="flex gap-2">
        {['week','month','quarter','year'].map(p => <button key={p} onClick={()=>setPeriod(p)} className={`px-4 py-2 rounded-lg text-sm font-semibold ${period===p?'bg-kaptan-primary text-white':'bg-kaptan-card text-kaptan-muted'}`}>{p==='week'?'Haftalık':p==='month'?'Aylık':p==='quarter'?'3 Aylık':'Yıllık'}</button>)}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {REPORT_TYPES.map(r => (
          <div key={r.key} className="kaptan-card p-6 text-center space-y-4">
            <r.icon size={40} className="mx-auto text-kaptan-primary" />
            <div><h3 className="font-bold text-kaptan-text">{r.label}</h3><p className="text-kaptan-muted text-xs mt-1">{r.desc}</p></div>
            <button onClick={()=>handleExport(r.key)} disabled={exporting===r.key} className="w-full py-2.5 bg-kaptan-primary text-white rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
              {exporting===r.key ? '...' : <><Download size={14} /> PDF İndir</>}
            </button>
          </div>
        ))}
        <div className="kaptan-card p-6 text-center space-y-4 md:col-span-3">
          <FileSpreadsheet size={40} className="mx-auto text-kaptan-success" />
          <div><h3 className="font-bold text-kaptan-text">CSV Export</h3><p className="text-kaptan-muted text-xs mt-1">Ham veriyi CSV olarak dışa aktar</p></div>
          <button onClick={()=>handleExport('csv')} disabled={exporting==='csv'} className="px-8 py-2.5 bg-kaptan-success text-white rounded-lg font-semibold disabled:opacity-50">
            {exporting==='csv' ? '...' : 'CSV İndir'}
          </button>
          {preview.length > 0 && (
            <div className="mt-4 p-3 bg-kaptan-dark rounded-lg overflow-x-auto text-left">
              <p className="text-kaptan-muted text-xs mb-2">İlk 10 satır önizleme:</p>
              <table className="text-xs">{preview.map((row: string[], i: number) => <tr key={i}>{row.map((cell: string, j: number) => <td key={j} className="pr-4 py-0.5 text-kaptan-text whitespace-nowrap">{cell}</td>)}</tr>)}</table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
