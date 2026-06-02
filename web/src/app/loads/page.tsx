'use client';

import { useState, useMemo } from 'react';
import { useMutation, useQueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/queryClient';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { api, ApiError, showToast } from '@/lib/api';
import { loadStep1Schema, loadStep2Schema, loadStep3Schema, type LoadStep1Form, type LoadStep2Form, type LoadStep3Form } from '@/lib/validations';
import { useLoadsQuery } from '@/lib/queries';
import type { Load } from '@/types/api';
import { Plus, Search, Trash2, MapPin, ExternalLink, Shield, Navigation } from 'lucide-react';
import { CITIES, CITY_LIST } from '@/constants/cities';

const LOAD_TYPES = ['Tam Yük', 'Kısmi Yük', 'Evden Eve', 'Şehir İçi'] as const;

const VEHICLE_OPTIONS: Record<string, string[]> = {
  'Tam Yük': ['Çekici (TIR)', 'Kamyon', 'Kırkayak Kamyon', 'Lowbed Çekici', 'Tanker Çekici', 'Frigorifik Araç', 'Konteyner Taşıyıcı', 'Silobas Çekici'],
  'Kısmi Yük': ['Çekici (TIR)', 'Kamyon', 'Kırkayak Kamyon', 'Frigorifik Araç'],
  'Evden Eve': ['Kapalı Kasa Kamyon', 'Kapalı Kasa Kamyonet', 'Panelvan', 'Liftli Nakliye Araci', 'Asansörlü Nakliyat Araci'],
  'Şehir İçi': ['Panelvan', 'Kamyonet', 'Pickup', 'Moto Kurye', 'Minivan', 'Frigorifik Minivan', 'Hafif Ticari Arac'],
};

const TRAILER_OPTIONS: Record<string, string[]> = {
  'Tam Yük': ['Tenteli Dorse', 'Mega Dorse', 'Frigorifik Dorse', 'Damper Dorse', 'Havuz Dorse', 'Lowbed Dorse', 'Konteyner Dorse', 'Silobas Dorse', 'Tanker Dorse', 'Platform Dorse', 'Sal Dorse', 'Açık Kasa Dorse'],
  'Kısmi Yük': ['Tenteli Dorse', 'Mega Dorse', 'Frigorifik Dorse', 'Açık Kasa Dorse'],
  'Evden Eve': ['Kapalı Kasa', 'Liftli Kapalı Kasa', 'Mobilya Taşıma Kasası', 'Asansörlü Taşıma Sistemi'],
  'Şehir İçi': ['Kapalı Kasa', 'Açık Kasa', 'Frigorifik Kasa', 'Kurye Kasası', 'Hafif Ticari Kasa'],
};

const TRANSPORT_TYPES: Record<string, string[]> = {
  'Evden Eve': ['Ev Eşyası', 'Ofis Eşyası', 'Beyaz Eşya', 'Mobilya', 'Parça Eşya', 'Antika / Hassas Eşya'],
  'Şehir İçi': ['Market Dağıtımı', 'Restoran Sevkiyatı', 'İlaç Dağıtımı', 'E-Ticaret Teslimatı', 'Soğuk Zincir', 'Tarım Ürünleri', 'Kargo Dağıtımı', 'Sanayi İçi Dağıtım'],
};

function LoadsContent() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [quickMode, setQuickMode] = useState(false);
  const [editingLoad, setEditingLoad] = useState<Load | null>(null);
  const [step, setStep] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [originDistricts, setOriginDistricts] = useState<string[]>([]);
  const [destDistricts, setDestDistricts] = useState<string[]>([]);

  // Faz-1: useLoadsQuery — mobildeki useRecentLoads ile aynı pattern
  const { data: loads = [], isLoading: loading } = useLoadsQuery();

  // Faz-1: react-hook-form + Zod — her adım için ayrı useForm (mobil Step1Common/Step2Dynamic/Step3Pricing ile aynı)
  const f1 = useForm<LoadStep1Form>({ mode: 'onBlur', resolver: zodResolver(loadStep1Schema), defaultValues: { title: '', loadType: 'Tam Yük', originCity: '', originDistrict: '', originAddress: '', destCity: '', destDistrict: '', destAddress: '', contactName: '', contactPhone: '', loadingDate: '', loadingTime: '', deliveryDate: '', deliveryTime: '', description: '' } });
  const f2 = useForm<LoadStep2Form>({ resolver: zodResolver(loadStep2Schema), defaultValues: { vehicleType: '', trailerType: '', weight: '', pieces: '', volume: '', packageType: '', sharedTransport: false, urgency: '', transportType: '', itemList: '', senderFloor: '', receiverFloor: '', senderElevator: false, receiverElevator: false, packagingNeeded: false, estimatedDistance: '', deliveryTimeSlot: '', cargoSize: '', coldChain: false } });
  const f3 = useForm<LoadStep3Form>({ resolver: zodResolver(loadStep3Schema), defaultValues: { pricingType: 'fixed', price: '', tonnage: '', pricePerTon: '', auctionEnabled: false, auctionMinPrice: '', auctionMaxPrice: '', auctionStartDate: '', auctionStartTime: '', auctionEndDate: '', auctionEndTime: '', cashOnDelivery: false, insuranceEnabled: false, escrowEnabled: false } });

  const f1Err = f1.formState.errors;
  const f3Err = f3.formState.errors;
  const watchPricingType = f3.watch('pricingType');
  const watchAuction = f3.watch('auctionEnabled');
  const watchLoadType = f1.watch('loadType');

  // Faz-1: useMutation — mobildeki useCreateLoad ile aynı pattern
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => editingLoad ? api.put(`/loads/${editingLoad.id}`, payload) : api.post('/loads', payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['loads'] }); showToast(editingLoad ? 'Yük güncellendi.' : 'Yük oluşturuldu.', 'success'); setShowForm(false); resetAll(); },
    onError: (err: any) => showToast(err instanceof ApiError ? err.message : (err.response?.data?.message || 'Hata'), 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/loads/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['loads'] }); showToast('Yük silindi.', 'success'); },
  });

  const resetAll = () => {
    f1.reset(); f2.reset(); f3.reset();
    setStep(1); setEditingLoad(null);
  };

  const calcPrice = () => {
    const data = f3.getValues();
    if (data.pricingType === 'tonnage') { const t = parseFloat(data.tonnage || '0') || 0; const p = parseFloat(data.pricePerTon || '0') || 0; return { net: t * p, kdv: t * p * 0.20, total: t * p * 1.20 }; }
    const p = parseFloat(data.price || '0') || 0;
    return { net: p, kdv: p * 0.20, total: p * 1.20 };
  };
  const priceCalc = useMemo(calcPrice, [f3.watch('pricingType'), f3.watch('price'), f3.watch('tonnage'), f3.watch('pricePerTon')]);

  const handleNext = async () => {
    if (step === 1) { const ok = await f1.trigger(); if (!ok) { showToast(Object.values(f1Err)[0]?.message || 'Zorunlu alanları doldurun', 'warning'); return; } setStep(2); }
    else if (step === 2) { setStep(3); }
  };

  const handleSubmit = async () => {
    const ok = await f3.trigger();
    if (!ok) { showToast(Object.values(f3Err)[0]?.message || 'Fiyat bilgilerini kontrol edin', 'warning'); return; }
    const f1v = f1.getValues(); const f2v = f2.getValues(); const f3v = f3.getValues();
    // Form → API alan eşlemesi (backend DTO ile uyumlu)
    const payload = {
      title: f1v.title,
      loadType: f1v.loadType === 'Tam Yük' ? 'tam_yuk' : f1v.loadType === 'Kısmi Yük' ? 'kismi_yuk' : f1v.loadType === 'Evden Eve' ? 'evden_eve' : 'sehir_ici',
      fromCity: f1v.originCity, toCity: f1v.destCity,
      fromDistrict: f1v.originDistrict || '', toDistrict: f1v.destDistrict || '',
      fromAddress: f1v.originAddress, toAddress: f1v.destAddress,
      contactName: f1v.contactName, contactPhone: f1v.contactPhone,
      pickupDate: f1v.loadingDate, pickupTime: f1v.loadingTime || undefined,
      deliveryDate: f1v.deliveryDate, deliveryTime: f1v.deliveryTime || undefined,
      description: f1v.description || undefined,
      vehicleType: f2v.vehicleType || undefined,
      trailerType: f2v.trailerType || undefined,
      totalTonnage: f2v.weight ? Number(f2v.weight) : undefined,
      volume: f2v.volume ? Number(f2v.volume) : undefined,
      coldChain: f2v.coldChain || undefined,
      pricingType: f3v.pricingType === 'tonnage' ? 'tonaj' : 'komple',
      totalPrice: f3v.price ? Number(f3v.price) : undefined,
      pricePerTon: f3v.pricePerTon ? Number(f3v.pricePerTon) : undefined,
      totalKg: f3v.tonnage ? Number(f3v.tonnage) * 1000 : undefined,
      escrow: f3v.escrowEnabled || undefined,
      insurance: f3v.insuranceEnabled || undefined,
      isAuction: f3v.auctionEnabled || undefined,
      auctionMinPrice: f3v.auctionMinPrice ? Number(f3v.auctionMinPrice) : undefined,
      auctionMaxPrice: f3v.auctionMaxPrice ? Number(f3v.auctionMaxPrice) : undefined,
      kdvRate: 20, totalAmount: priceCalc.total,
    };
    saveMutation.mutate(payload);
  };

  const filtered = loads.filter((l: any) => !search || l.title?.toLowerCase().includes(search.toLowerCase()) || l.originCity?.toLowerCase().includes(search.toLowerCase()) || l.destCity?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-kaptan-text">Yük Yönetimi</h2>
        <div className="flex gap-2">
          <button onClick={() => { resetAll(); setQuickMode(false); setShowForm(true); }} className="px-4 py-2 bg-kaptan-primary text-white rounded-lg hover:opacity-90 transition flex items-center gap-2"><Plus size={18} /> Yeni Yük</button>
          <button onClick={() => { resetAll(); setQuickMode(true); setShowForm(true); }} className="px-4 py-2 bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 rounded-lg hover:bg-emerald-500/20 transition flex items-center gap-2 text-sm"><Plus size={16} /> Hızlı Ekle</button>
        </div>
      </div>

      <div className="mb-4 relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-kaptan-muted" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Yük ara (başlık, şehir)..." className="w-full pl-10 pr-4 py-2 glass-card text-kaptan-text placeholder-kaptan-muted" />
      </div>

      {/* Load Table */}
      {loading ? <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-16 bg-kaptan-card animate-pulse rounded-lg" />)}</div>
      : filtered.length === 0 ? <p className="text-center text-kaptan-muted py-12">Henüz yük kaydı bulunmuyor</p>
      : <div className="kaptan-card overflow-hidden"><table className="w-full text-sm">
        <thead><tr className="border-b border-kaptan-border text-kaptan-muted"><th className="text-left p-3">Yük</th><th className="text-left p-3">Tür</th><th className="text-left p-3">Rota</th><th className="text-left p-3">Araç</th><th className="text-left p-3">Fiyat</th><th className="text-left p-3">Etiketler</th><th className="text-left p-3">İşlemler</th></tr></thead>
        <tbody>
          {filtered.map((load: any) => (
            <tr key={load.id} className="border-b border-kaptan-border/50 hover:bg-kaptan-primary/5">
              <td className="p-3 font-medium text-kaptan-text max-w-[180px] truncate">{load.title}</td>
              <td className="p-3"><span className="px-2 py-0.5 rounded text-xs bg-kaptan-primary/20 text-kaptan-primary">{load.loadType}</span></td>
              <td className="p-3 text-xs text-kaptan-muted"><MapPin size={10} className="inline mr-1" />{load.originCity} → {load.destCity}</td>
              <td className="p-3 text-xs text-kaptan-muted">{load.vehicleType || '-'}</td>
              <td className="p-3 text-kaptan-text font-medium">{load.totalAmount ? `${Number(load.totalAmount).toLocaleString('tr-TR')} ₺` : load.price ? `${Number(load.price).toLocaleString('tr-TR')} ₺` : '-'}</td>
              <td className="p-3"><div className="flex gap-1 flex-wrap">
                {load.escrowEnabled && <span className="px-1.5 py-0.5 rounded text-[10px] bg-kaptan-success/20 text-kaptan-success">Escrow</span>}
                {load.auctionEnabled && <span className="px-1.5 py-0.5 rounded text-[10px] bg-kaptan-warning/20 text-kaptan-warning">İhale</span>}
                {load.insuranceEnabled && <span className="px-1.5 py-0.5 rounded text-[10px] bg-kaptan-info/20 text-kaptan-info">Sigorta</span>}
              </div></td>
              <td className="p-3"><div className="flex gap-1">
                <Link href={`/loads/${load.id}`} className="p-1.5 hover:bg-kaptan-primary/20 rounded text-kaptan-primary"><ExternalLink size={16} /></Link>
                <button onClick={() => { if (!confirm('Silinsin mi?')) return; setDeletingId(load.id); deleteMutation.mutate(load.id, { onSettled: () => setDeletingId(null) }); }} disabled={deletingId === load.id} className="p-1.5 hover:bg-kaptan-danger/20 rounded text-kaptan-danger"><Trash2 size={16} /></button>
              </div></td>
            </tr>
          ))}
        </tbody>
      </table></div>}

      {/* ── Modal Form ──────────────────────────────────────────── */}
      {showForm && quickMode ? (
        /* ═══════════ HIZLI YÜK EKLE (tek sayfa) ═══════════ */
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="glass-card rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[var(--text)] mb-4">Hızlı Yük Ekle</h3>
            <div className="space-y-3">
              <F label="Başlık" error={f1Err.title?.message}><input {...f1.register('title')} className="w-full px-3 py-2.5 rounded-xl text-sm text-[var(--text)] bg-white/[0.04] border border-[var(--glass-border)] focus:border-[#FF7A00] focus:ring-2 focus:ring-[#FF7A00]/20 outline-none" placeholder="İstanbul → Ankara çimento" /></F>
              <F label="Yük Tipi">
                <select {...f1.register('loadType')} className="w-full px-3 py-2.5 rounded-xl text-sm text-[var(--text)] bg-white/[0.04] border border-[var(--glass-border)] outline-none">
                  {LOAD_TYPES.map(lt => <option key={lt} value={lt}>{lt}</option>)}
                </select>
              </F>
              <div className="grid grid-cols-2 gap-3">
                <F label="Kalkış"><input {...f1.register('originCity')} className="w-full px-3 py-2.5 rounded-xl text-sm text-[var(--text)] bg-white/[0.04] border border-[var(--glass-border)] focus:border-[#FF7A00] focus:ring-2 focus:ring-[#FF7A00]/20 outline-none" placeholder="İstanbul" /></F>
                <F label="Varış"><input {...f1.register('destCity')} className="w-full px-3 py-2.5 rounded-xl text-sm text-[var(--text)] bg-white/[0.04] border border-[var(--glass-border)] focus:border-[#FF7A00] focus:ring-2 focus:ring-[#FF7A00]/20 outline-none" placeholder="Ankara" /></F>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <F label="Yükleme Tarihi"><input {...f1.register('loadingDate')} type="date" className="w-full px-3 py-2.5 rounded-xl text-sm text-[var(--text)] bg-white/[0.04] border border-[var(--glass-border)] outline-none [color-scheme:dark]" /></F>
                <F label="Teslim Tarihi"><input {...f1.register('deliveryDate')} type="date" className="w-full px-3 py-2.5 rounded-xl text-sm text-[var(--text)] bg-white/[0.04] border border-[var(--glass-border)] outline-none [color-scheme:dark]" /></F>
              </div>
              <F label="Fiyat (₺)">
                <input type="number" onChange={e => f3.setValue('price', e.target.value)} className="w-full px-3 py-2.5 rounded-xl text-sm text-[var(--text)] bg-white/[0.04] border border-[var(--glass-border)] focus:border-[#FF7A00] focus:ring-2 focus:ring-[#FF7A00]/20 outline-none" placeholder="15000" />
              </F>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl font-semibold border border-[var(--glass-border)] text-slate-400 hover:text-[var(--text)] transition-colors">İptal</button>
                <button onClick={async () => {
                  const f1v = f1.getValues();
                  if (!f1v.title || !f1v.originCity || !f1v.destCity || !f1v.loadingDate) { showToast('Başlık, kalkış, varış ve tarih zorunlu', 'warning'); return; }
                  const payload = { title: f1v.title, loadType: f1v.loadType === 'Tam Yük' ? 'tam_yuk' : 'kismi_yuk', fromCity: f1v.originCity, toCity: f1v.destCity, fromDistrict: '', toDistrict: '', fromAddress: f1v.originCity, toAddress: f1v.destCity, contactName: 'Hızlı', contactPhone: '05320000000', pickupDate: f1v.loadingDate, deliveryDate: f1v.deliveryDate || f1v.loadingDate, totalPrice: Number(f3.getValues('price')) || 5000, pricingType: 'komple', totalAmount: Number(f3.getValues('price')) || 5000 };
                  saveMutation.mutate(payload as any);
                }} disabled={saveMutation.isPending} className="flex-1 py-2.5 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 disabled:opacity-50 transition-colors">
                  {saveMutation.isPending ? 'Kaydediliyor...' : 'Hızlı Kaydet'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => { setShowForm(false); resetAll(); }}>
          <div className="bg-kaptan-dark border border-kaptan-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            {/* Step Indicator */}
            <div className="flex items-center gap-2 mb-6">
              {[1,2,3].map(s => (<div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= s ? 'bg-kaptan-primary text-white' : 'bg-kaptan-border/30 text-kaptan-muted'}`}>{s}</div>
                <span className={`text-xs ${step >= s ? 'text-kaptan-text' : 'text-kaptan-muted'}`}>{s===1?'Ortak Alanlar':s===2?`${watchLoadType} Detayları`:'Fiyatlandırma'}</span>
                {s<3 && <div className={`w-8 h-0.5 ${step>s?'bg-kaptan-primary':'bg-kaptan-border/30'}`} />}
              </div>))}
            </div>

            {/* ── Step 1: Common Fields ────────────────────────────────── */}
            {step === 1 && <div className="space-y-3">
              <F label="Yük Tipi" error={f1Err.loadType?.message}>
                <div className="grid grid-cols-4 gap-2">
                  {LOAD_TYPES.map(lt => <button key={lt} type="button" onClick={() => f1.setValue('loadType', lt)} className={`px-2 py-2 rounded-lg text-xs font-semibold border transition ${f1.watch('loadType')===lt?'bg-kaptan-primary text-white border-kaptan-primary':'bg-kaptan-card text-kaptan-muted border-kaptan-border'}`}>{lt}</button>)}
                </div>
              </F>
              <F label="Başlık" error={f1Err.title?.message}><input {...f1.register('title')} className="w-full px-3 py-2 glass-card text-kaptan-text text-sm" placeholder="Yük başlığı (örn: İstanbul → Ankara çimento)" /></F>
              <div className="grid grid-cols-2 gap-3">
                <F label={<span className="flex items-center gap-1"><Navigation size={12} className="text-[#FF7A00]" /> Kalkış Şehri</span>} error={f1Err.originCity?.message}>
                  <select {...f1.register('originCity')} onChange={(e) => { f1.setValue('originCity', e.target.value); f1.setValue('originDistrict', ''); setOriginDistricts(CITIES[e.target.value] || []); }} className="w-full px-3 py-2 glass-card text-[var(--text)] text-sm">
                    <option value="">İl seçiniz</option>
                    {CITY_LIST.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </F>
                <F label="Kalkış İlçe">
                  <select {...f1.register('originDistrict')} className="w-full px-3 py-2 glass-card text-[var(--text)] text-sm" disabled={originDistricts.length === 0}>
                    <option value="">İlçe seçiniz</option>
                    {originDistricts.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </F>
              </div>
              <F label="Kalkış Adresi" error={f1Err.originAddress?.message}><input {...f1.register('originAddress')} className="w-full px-3 py-2 glass-card text-[var(--text)] text-sm" placeholder="Açık adres" /></F>
              <div className="grid grid-cols-2 gap-3">
                <F label={<span className="flex items-center gap-1"><MapPin size={12} className="text-[#FF7A00]" /> Varış Şehri</span>} error={f1Err.destCity?.message}>
                  <select {...f1.register('destCity')} onChange={(e) => { f1.setValue('destCity', e.target.value); f1.setValue('destDistrict', ''); setDestDistricts(CITIES[e.target.value] || []); }} className="w-full px-3 py-2 glass-card text-[var(--text)] text-sm">
                    <option value="">İl seçiniz</option>
                    {CITY_LIST.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </F>
                <F label="Varış İlçe">
                  <select {...f1.register('destDistrict')} className="w-full px-3 py-2 glass-card text-[var(--text)] text-sm" disabled={destDistricts.length === 0}>
                    <option value="">İlçe seçiniz</option>
                    {destDistricts.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </F>
              </div>
              <F label="Varış Adresi" error={f1Err.destAddress?.message}><input {...f1.register('destAddress')} className="w-full px-3 py-2 glass-card text-kaptan-text text-sm" placeholder="Açık adres" /></F>
              <div className="grid grid-cols-2 gap-3">
                <F label="İrtibat Adı" error={f1Err.contactName?.message}><input {...f1.register('contactName')} className="w-full px-3 py-2 glass-card text-kaptan-text text-sm" /></F>
                <F label="İrtibat Telefon" error={f1Err.contactPhone?.message}><input {...f1.register('contactPhone')} className="w-full px-3 py-2 glass-card text-kaptan-text text-sm" placeholder="05xx xxx xx xx" /></F>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <F label="Yükleme Tarihi" error={f1Err.loadingDate?.message}><input {...f1.register('loadingDate')} type="date" className="w-full px-3 py-2 glass-card text-[var(--text)] text-sm [color-scheme:dark]" /></F>
                  <F label="Yükleme Saati"><input {...f1.register('loadingTime')} type="time" className="w-full px-3 py-2 glass-card text-[var(--text)] text-sm [color-scheme:dark]" /></F>
                </div>
                <div className="space-y-1.5">
                  <F label="Teslim Tarihi" error={f1Err.deliveryDate?.message}><input {...f1.register('deliveryDate')} type="date" className="w-full px-3 py-2 glass-card text-[var(--text)] text-sm [color-scheme:dark]" /></F>
                  <F label="Teslim Saati"><input {...f1.register('deliveryTime')} type="time" className="w-full px-3 py-2 glass-card text-[var(--text)] text-sm [color-scheme:dark]" /></F>
                </div>
              </div>
              <F label="Açıklama"><textarea {...f1.register('description')} className="w-full px-3 py-2 glass-card text-kaptan-text text-sm" rows={2} /></F>
            </div>}

            {/* ── Step 2: Type-Specific Fields ──────────────────────────── */}
            {step === 2 && <div className="space-y-3">
              <F label="Araç Tipi"><select {...f2.register('vehicleType')} className="w-full px-3 py-2 glass-card text-kaptan-text text-sm">{[''].concat(VEHICLE_OPTIONS[watchLoadType]||[]).map(v=><option key={v} value={v}>{v||'Seçiniz'}</option>)}</select></F>
              {['Tam Yük','Kısmi Yük','Evden Eve','Şehir İçi'].includes(watchLoadType) && <F label="Dorse Tipi"><select {...f2.register('trailerType')} className="w-full px-3 py-2 glass-card text-kaptan-text text-sm">{[''].concat(TRAILER_OPTIONS[watchLoadType]||[]).map(v=><option key={v} value={v}>{v||'Seçiniz'}</option>)}</select></F>}
              {watchLoadType==='Tam Yük' && <><F label="Ağırlık (ton)"><input {...f2.register('weight')} className="w-full px-3 py-2 glass-card text-kaptan-text text-sm" type="number" /></F><label className="flex items-center gap-2 text-sm text-kaptan-muted"><input type="checkbox" {...f2.register('coldChain')} className="rounded" /> Soğuk Zincir</label></>}
              {watchLoadType==='Kısmi Yük' && <><div className="grid grid-cols-3 gap-2"><F label="Parça"><input {...f2.register('pieces')} className="w-full px-3 py-2 glass-card text-kaptan-text text-sm" type="number" /></F><F label="Hacim (m³)"><input {...f2.register('volume')} className="w-full px-3 py-2 glass-card text-kaptan-text text-sm" type="number" /></F></div><F label="Ambalaj"><select {...f2.register('packageType')} className="w-full px-3 py-2 glass-card text-kaptan-text text-sm">{['','Palet','Koli','Adet'].map(v=><option key={v} value={v}>{v||'Seçiniz'}</option>)}</select></F></>}
              {watchLoadType==='Evden Eve' && <><F label="Taşıma Tipi"><select {...f2.register('transportType')} className="w-full px-3 py-2 glass-card text-kaptan-text text-sm">{[''].concat(TRANSPORT_TYPES['Evden Eve']||[]).map(v=><option key={v} value={v}>{v||'Seçiniz'}</option>)}</select></F><div className="grid grid-cols-2 gap-2"><F label="Çıkış Kat"><input {...f2.register('senderFloor')} className="w-full px-3 py-2 glass-card text-kaptan-text text-sm" type="number" /></F><F label="Varış Kat"><input {...f2.register('receiverFloor')} className="w-full px-3 py-2 glass-card text-kaptan-text text-sm" type="number" /></F></div></>}
              {watchLoadType==='Şehir İçi' && <><F label="Mesafe (km)"><input {...f2.register('estimatedDistance')} className="w-full px-3 py-2 glass-card text-kaptan-text text-sm" type="number" /></F><F label="Teslimat Zamanı"><select {...f2.register('deliveryTimeSlot')} className="w-full px-3 py-2 glass-card text-kaptan-text text-sm">{['','09:00-12:00','12:00-17:00','17:00-21:00'].map(v=><option key={v} value={v}>{v||'Seçiniz'}</option>)}</select></F></>}
            </div>}

            {/* ── Step 3: Pricing ───────────────────────────────────────── */}
            {step === 3 && <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => f3.setValue('pricingType', 'fixed')} className={`px-3 py-2 rounded-lg text-sm font-semibold border ${watchPricingType==='fixed'?'bg-kaptan-primary text-white border-kaptan-primary':'bg-kaptan-card text-kaptan-muted border-kaptan-border'}`}>Komple Fiyat</button>
                <button type="button" onClick={() => f3.setValue('pricingType', 'tonnage')} className={`px-3 py-2 rounded-lg text-sm font-semibold border ${watchPricingType==='tonnage'?'bg-kaptan-primary text-white border-kaptan-primary':'bg-kaptan-card text-kaptan-muted border-kaptan-border'}`}>Tonaj Bazlı</button>
              </div>
              {watchPricingType==='fixed' ? <F label="Fiyat (₺)" error={f3Err.price?.message}><input {...f3.register('price')} className="w-full px-3 py-2 glass-card text-kaptan-text text-sm" type="number" /></F>
              : <div className="grid grid-cols-2 gap-3"><F label="Tonaj" error={f3Err.tonnage?.message}><input {...f3.register('tonnage')} className="w-full px-3 py-2 glass-card text-kaptan-text text-sm" type="number" /></F><F label="Ton Başı Fiyat (₺)" error={f3Err.pricePerTon?.message}><input {...f3.register('pricePerTon')} className="w-full px-3 py-2 glass-card text-kaptan-text text-sm" type="number" /></F></div>}

              {/* Price preview */}
              <div className="p-3 bg-kaptan-card rounded-lg border border-kaptan-border">
                <div className="flex justify-between text-sm"><span className="text-kaptan-muted">Net</span><span className="text-kaptan-text font-semibold">{priceCalc.net.toLocaleString('tr-TR')} ₺</span></div>
                <div className="flex justify-between text-sm"><span className="text-kaptan-muted">KDV (%20)</span><span className="text-kaptan-text">{priceCalc.kdv.toLocaleString('tr-TR')} ₺</span></div>
                <div className="flex justify-between text-sm font-bold mt-1 pt-1 border-t border-kaptan-border"><span className="text-kaptan-text">Toplam</span><span className="text-kaptan-primary">{priceCalc.total.toLocaleString('tr-TR')} ₺</span></div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-kaptan-muted"><input type="checkbox" {...f3.register('escrowEnabled')} className="rounded" /><Shield size={14} /> Escrow Koruması</label>
                <label className="flex items-center gap-2 text-sm text-kaptan-muted"><input type="checkbox" {...f3.register('insuranceEnabled')} className="rounded" /> Sigorta</label>
                <label className="flex items-center gap-2 text-sm text-kaptan-muted"><input type="checkbox" {...f3.register('auctionEnabled')} className="rounded" /> Açık Artırma</label>
              </div>

              {watchAuction && <div className="p-3 bg-kaptan-card rounded-lg border border-kaptan-border space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <F label="Min Fiyat (₺)" error={f3Err.auctionMinPrice?.message}><input {...f3.register('auctionMinPrice')} className="w-full px-3 py-2 bg-kaptan-dark border border-kaptan-border rounded-lg text-kaptan-text text-sm" type="number" /></F>
                  <F label="Max Fiyat (₺)"><input {...f3.register('auctionMaxPrice')} className="w-full px-3 py-2 bg-kaptan-dark border border-kaptan-border rounded-lg text-kaptan-text text-sm" type="number" /></F>
                </div>
              </div>}
            </div>}

            {/* Footer */}
            <div className="flex justify-between mt-6 pt-4 border-t border-kaptan-border">
              <button onClick={() => step===1 ? (setShowForm(false), resetAll()) : setStep(step-1)} className="px-4 py-2 border border-kaptan-border rounded-lg text-kaptan-muted text-sm">Geri</button>
              {step < 3 ? <button onClick={handleNext} className="px-6 py-2 bg-kaptan-primary text-white rounded-lg text-sm font-semibold">Devam</button>
              : <button onClick={handleSubmit} disabled={saveMutation.isPending} className="px-6 py-2 bg-kaptan-success text-white rounded-lg text-sm font-semibold disabled:opacity-50">{saveMutation.isPending ? 'Kaydediliyor...' : 'Yükü Kaydet'}</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Form Field Helper ──────────────────────────────────────────────────────
function F({ label, error, children }: { label: React.ReactNode; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-kaptan-muted mb-1">{label}{error ? <span className="text-kaptan-danger ml-1">*</span> : ''}</label>
      {children}
      {error && <p className="text-xs text-kaptan-danger mt-1">{error}</p>}
    </div>
  );
}

export default function LoadsPage() {
  const [queryClient] = useState(() => getQueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <LoadsContent />
    </QueryClientProvider>
  );
}
