'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ArrowLeft, AlertTriangle, Send } from 'lucide-react';

const REASONS = [
  { key: 'not_as_described', label: 'Ürün açıklamaya uymuyor' },
  { key: 'damaged', label: 'Ürün hasarlı geldi' },
  { key: 'wrong_item', label: 'Yanlış ürün gönderildi' },
  { key: 'not_received', label: 'Ürün teslim edilmedi' },
  { key: 'other', label: 'Diğer' },
];

function PartDisputeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const transactionId = searchParams.get('transactionId') || '';
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason) { alert('Sebep seçiniz'); return; }
    setSubmitting(true);
    try {
      await api.post('/part-market/disputes', { transactionId, reason, description: description.trim() });
      alert('İtiraz kaydı oluşturuldu! 48 saat içinde incelenecek.');
      router.push('/part-market');
    } catch { alert('İtiraz oluşturulamadı'); }
    setSubmitting(false);
  };

  return (
    <div className="p-6 max-w-lg mx-auto space-y-6">
      <button onClick={()=>router.back()} className="flex items-center gap-2 text-kaptan-muted hover:text-kaptan-text"><ArrowLeft size={18} /> Geri</button>
      <h1 className="text-2xl font-bold text-kaptan-text flex items-center gap-2"><AlertTriangle size={24} className="text-kaptan-danger" /> İtiraz / Sorun Bildir</h1>

      <div className="kaptan-card p-6 space-y-4">
        <div>
          <label className="text-kaptan-muted text-sm mb-2 block">Sebep</label>
          <div className="space-y-2">
            {REASONS.map(r => (
              <button key={r.key} onClick={()=>setReason(r.key)} className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition ${reason===r.key?'bg-kaptan-primary/20 border-kaptan-primary text-kaptan-primary':'bg-kaptan-card border-kaptan-border text-kaptan-muted'}`}>
                {reason===r.key ? '● ' : '○ '}{r.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-kaptan-muted text-sm mb-1 block">Açıklama</label>
          <textarea value={description} onChange={e=>setDescription(e.target.value)} className="w-full px-3 py-2 bg-kaptan-dark border border-kaptan-border rounded-lg text-kaptan-text text-sm" rows={4} placeholder="Sorunu detaylı açıklayın..." />
        </div>
        <button onClick={handleSubmit} disabled={submitting} className="w-full py-3 bg-kaptan-danger text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"><Send size={16} /> İtirazı Gönder</button>
      </div>
    </div>
  );
}

export default function PartDisputePage() {
  return (
    <Suspense fallback={<div className="p-6"><div className="h-48 skeleton rounded" /></div>}>
      <PartDisputeContent />
    </Suspense>
  );
}
