'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Plus, Search, Edit, Trash2, Eye, ChevronRight, ChevronLeft, CheckCircle, MapPin, Truck, Package, Shield, Percent } from 'lucide-react';

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

const TIME_SLOTS = ['09:00 - 12:00', '12:00 - 17:00', '17:00 - 21:00'];
const URGENCY_OPTIONS = ['Aynı Gün', 'Ertesi Gün', '3 Gün İçinde'];
const PACKAGE_TYPES = ['Palet', 'Koli', 'Adet'];

type Step1 = {
  title: string; loadType: typeof LOAD_TYPES[number]; originCity: string; originDistrict: string;
  originAddress: string; destCity: string; destDistrict: string; destAddress: string;
  contactName: string; contactPhone: string; loadingDate: string; loadingTime: string;
  deliveryDate: string; deliveryTime: string; description: string;
};

type Step2 = {
  vehicleType: string; trailerType: string; weight: string; pieces: string; volume: string;
  packageType: string; sharedTransport: boolean; urgency: string;
  // Evden Eve
  transportType: string; itemList: string; senderFloor: string; receiverFloor: string;
  senderElevator: boolean; receiverElevator: boolean; packagingNeeded: boolean;
  // Sehir Ici
  estimatedDistance: string; deliveryTimeSlot: string; cargoSize: string;
  // Tam Yük
  coldChain: boolean;
};

type Step3 = {
  auctionEnabled: boolean; auctionMinPrice: string; auctionMaxPrice: string;
  auctionStartDate: string; auctionStartTime: string; auctionEndDate: string; auctionEndTime: string;
  cashOnDelivery: boolean; insuranceEnabled: boolean; escrowEnabled: boolean;
  pricingType: 'tonnage' | 'fixed'; price: string; tonnage: string; pricePerTon: string;
};

export default function LoadsPage() {
  const [loads, setLoads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingLoad, setEditingLoad] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [s1, setS1] = useState<Step1>({ title: '', loadType: 'Tam Yük', originCity: '', originDistrict: '', originAddress: '', destCity: '', destDistrict: '', destAddress: '', contactName: '', contactPhone: '', loadingDate: '', loadingTime: '', deliveryDate: '', deliveryTime: '', description: '' });
  const [s2, setS2] = useState<Step2>({ vehicleType: '', trailerType: '', weight: '', pieces: '', volume: '', packageType: '', sharedTransport: false, urgency: '', transportType: '', itemList: '', senderFloor: '', receiverFloor: '', senderElevator: false, receiverElevator: false, packagingNeeded: false, estimatedDistance: '', deliveryTimeSlot: '', cargoSize: '', coldChain: false });
  const [s3, setS3] = useState<Step3>({ auctionEnabled: false, auctionMinPrice: '', auctionMaxPrice: '', auctionStartDate: '', auctionStartTime: '', auctionEndDate: '', auctionEndTime: '', cashOnDelivery: false, insuranceEnabled: false, escrowEnabled: false, pricingType: 'fixed', price: '', tonnage: '', pricePerTon: '' });

  const fetchLoads = async () => {
    setLoading(true);
    try { const res = await api.get('/loads'); setLoads(Array.isArray(res.data?.data?.data || res.data?.data) ? (res.data?.data?.data || res.data?.data) : []); } catch { setLoads([]); }
    setLoading(false);
  };
  useEffect(() => { fetchLoads(); }, []);

  const resetAll = () => {
    setS1({ title: '', loadType: 'Tam Yük', originCity: '', originDistrict: '', originAddress: '', destCity: '', destDistrict: '', destAddress: '', contactName: '', contactPhone: '', loadingDate: '', loadingTime: '', deliveryDate: '', deliveryTime: '', description: '' });
    setS2({ vehicleType: '', trailerType: '', weight: '', pieces: '', volume: '', packageType: '', sharedTransport: false, urgency: '', transportType: '', itemList: '', senderFloor: '', receiverFloor: '', senderElevator: false, receiverElevator: false, packagingNeeded: false, estimatedDistance: '', deliveryTimeSlot: '', cargoSize: '', coldChain: false });
    setS3({ auctionEnabled: false, auctionMinPrice: '', auctionMaxPrice: '', auctionStartDate: '', auctionStartTime: '', auctionEndDate: '', auctionEndTime: '', cashOnDelivery: false, insuranceEnabled: false, escrowEnabled: false, pricingType: 'fixed', price: '', tonnage: '', pricePerTon: '' });
    setStep(1);
  };

  // KDV hesaplama
  const calcPrice = () => {
    if (s3.pricingType === 'tonnage') {
      const tons = parseFloat(s3.tonnage) || 0;
      const ppt = parseFloat(s3.pricePerTon) || 0;
      return { net: tons * ppt, kdv: (tons * ppt) * 0.20, total: (tons * ppt) * 1.20 };
    }
    const price = parseFloat(s3.price) || 0;
    return { net: price, kdv: price * 0.20, total: price * 1.20 };
  };
  const priceCalc = calcPrice();

  const validateStep1 = () => {
    if (!s1.title || s1.title.length < 5) { alert('Başlık en az 5 karakter olmalıdır'); return false; }
    if (!s1.originCity || !s1.originAddress) { alert('Yükleme adresi zorunludur'); return false; }
    if (!s1.destCity || !s1.destAddress) { alert('Teslimat adresi zorunludur'); return false; }
    if (!s1.contactName || !s1.contactPhone) { alert('İrtibat bilgileri zorunludur'); return false; }
    if (!s1.loadingDate) { alert('Yükleme tarihi zorunludur'); return false; }
    if (!s1.deliveryDate) { alert('Teslim tarihi zorunludur'); return false; }
    if (s1.deliveryDate < s1.loadingDate) { alert('Teslim tarihi yükleme tarihinden önce olamaz'); return false; }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateStep1()) return;
    setSaving(true);
    const payload = { ...s1, ...s2, ...s3, kdvRate: 20, netAmount: priceCalc.net, kdvAmount: priceCalc.kdv, totalAmount: priceCalc.total };
    try {
      if (editingLoad) await api.put(`/loads/${editingLoad.id}`, payload);
      else await api.post('/loads', payload);
      setShowForm(false); setEditingLoad(null); resetAll(); fetchLoads();
    } catch (err: any) { alert(err.response?.data?.message || 'Hata oluştu'); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu yükü silmek istediğinize emin misiniz?')) return;
    setDeletingId(id);
    try { await api.delete(`/loads/${id}`); fetchLoads(); } catch (err: any) { alert(err.response?.data?.message || 'Silme hatası'); }
    setDeletingId(null);
  };

  const filtered = loads.filter((l: any) => !search || l.title?.toLowerCase().includes(search.toLowerCase()) || l.originCity?.toLowerCase().includes(search.toLowerCase()) || l.destCity?.toLowerCase().includes(search.toLowerCase()));

  const renderStepIndicator = () => (
    <div className="flex items-center gap-2 mb-6">
      {[1, 2, 3].map(s => (
        <div key={s} className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${step >= s ? 'bg-kaptan-primary text-white' : 'bg-kaptan-border/30 text-kaptan-muted'}`}>{s}</div>
          <span className={`text-xs ${step >= s ? 'text-kaptan-text' : 'text-kaptan-muted'}`}>
            {s === 1 ? 'Ortak Alanlar' : s === 2 ? `${s1.loadType} Detayları` : 'Fiyatlandırma'}
          </span>
          {s < 3 && <div className={`w-8 h-0.5 ${step > s ? 'bg-kaptan-primary' : 'bg-kaptan-border/30'}`} />}
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-kaptan-text">Yük Yönetimi</h2>
        <div className="flex gap-2">
          <span className="text-sm text-kaptan-muted self-center">{loads.length} yük • {loads.filter(l => l.status === 'active').length} aktif</span>
          <button onClick={() => { resetAll(); setEditingLoad(null); setShowForm(true); }}
            className="flex items-center gap-2 bg-kaptan-primary text-white px-4 py-2 rounded-lg hover:bg-kaptan-primary/90">
            <Plus size={18} /> Yeni Yük
          </button>
        </div>
      </div>

      <div className="mb-4 relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-kaptan-muted" />
        <input className="w-full bg-kaptan-card border border-kaptan-border rounded-lg pl-10 pr-4 py-2.5 text-kaptan-text placeholder-kaptan-muted"
          placeholder="Yük başlığı, şehir ara..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-kaptan-card rounded-xl animate-pulse" />)}</div> : (
        <div className="bg-kaptan-card border border-kaptan-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-kaptan-border text-kaptan-muted"><th className="text-left p-3">Yük</th><th className="text-left p-3">Tür</th><th className="text-left p-3">Rota</th><th className="text-left p-3">Araç</th><th className="text-left p-3">Fiyat</th><th className="text-left p-3">Etiketler</th><th className="text-left p-3">İşlemler</th></tr></thead>
            <tbody>
              {filtered.map((load: any) => (
                <tr key={load.id} className="border-b border-kaptan-border/50 hover:bg-kaptan-primary/5">
                  <td className="p-3 font-medium text-kaptan-text max-w-[180px] truncate">{load.title}</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded text-xs bg-kaptan-primary/20 text-kaptan-primary">{load.loadType}</span></td>
                  <td className="p-3 text-xs text-kaptan-muted"><MapPin size={10} className="inline mr-1" />{load.originCity} → {load.destCity}</td>
                  <td className="p-3 text-xs text-kaptan-muted">{load.vehicleType || '-'}</td>
                  <td className="p-3 text-kaptan-text font-medium">{load.totalAmount ? `${Number(load.totalAmount).toLocaleString('tr-TR')} ₺` : load.price ? `${Number(load.price).toLocaleString('tr-TR')} ₺` : '-'}</td>
                  <td className="p-3">
                    <div className="flex gap-1 flex-wrap">
                      {load.escrowEnabled && <span className="px-1.5 py-0.5 rounded text-[10px] bg-green-500/20 text-green-400">Escrow</span>}
                      {load.auctionEnabled && <span className="px-1.5 py-0.5 rounded text-[10px] bg-yellow-500/20 text-yellow-400">İhale</span>}
                      {load.insuranceEnabled && <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-400">Sigorta</span>}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <button onClick={() => handleDelete(load.id)} disabled={deletingId === load.id}
                        className="p-1.5 hover:bg-kaptan-danger/20 rounded text-kaptan-danger disabled:opacity-50"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-kaptan-muted">Henüz yük kaydı bulunmuyor</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center pt-6 z-50 overflow-y-auto pb-20">
          <div className="bg-kaptan-card border border-kaptan-border rounded-2xl p-6 w-full max-w-2xl mx-4 my-4">
            <h3 className="text-lg font-semibold text-kaptan-text mb-1">{editingLoad ? 'Yük Düzenle' : 'Yeni Sevkiyat Ekle'}</h3>
            {renderStepIndicator()}

            {/* ── STEP 1: ORTAK ALANLAR ── */}
            {step === 1 && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-kaptan-muted mb-1">Yük Türü Seçiniz *</label>
                  <select className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2.5 text-kaptan-text" value={s1.loadType}
                    onChange={e => { setS1({...s1, loadType: e.target.value as any}); setS2({...s2, vehicleType: '', trailerType: '', transportType: '' }); }}>
                    {LOAD_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-kaptan-muted mb-1">Başlık * <span className="text-kaptan-muted text-xs">(5-20 karakter)</span></label>
                  <input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2.5 text-kaptan-text" required minLength={5} maxLength={20}
                    value={s1.title} onChange={e => setS1({...s1, title: e.target.value})} placeholder="örn: 28 Ton Komur" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-kaptan-muted mb-1">Nereden (İl) *</label>
                    <input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" value={s1.originCity} onChange={e => setS1({...s1, originCity: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm text-kaptan-muted mb-1">Nereden (İlçe)</label>
                    <input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" value={s1.originDistrict} onChange={e => setS1({...s1, originDistrict: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-kaptan-muted mb-1">Yükleme Adresi *</label>
                  <input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" value={s1.originAddress} onChange={e => setS1({...s1, originAddress: e.target.value})} placeholder="Mahalle, Sokak, Bina No, Açık Adres" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-kaptan-muted mb-1">Nereye (İl) *</label>
                    <input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" value={s1.destCity} onChange={e => setS1({...s1, destCity: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm text-kaptan-muted mb-1">Nereye (İlçe)</label>
                    <input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" value={s1.destDistrict} onChange={e => setS1({...s1, destDistrict: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-kaptan-muted mb-1">Teslimat Adresi *</label>
                  <input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" value={s1.destAddress} onChange={e => setS1({...s1, destAddress: e.target.value})} placeholder="Mahalle, Sokak, Bina No, Açık Adres" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-kaptan-muted mb-1">İrtibat Ad Soyad *</label>
                    <input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" value={s1.contactName} onChange={e => setS1({...s1, contactName: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm text-kaptan-muted mb-1">İrtibat Telefon *</label>
                    <input type="tel" className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" value={s1.contactPhone} onChange={e => setS1({...s1, contactPhone: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-kaptan-muted mb-1">Yükleme Tarihi *</label>
                    <input type="date" className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" value={s1.loadingDate} onChange={e => setS1({...s1, loadingDate: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm text-kaptan-muted mb-1">Yükleme Saati</label>
                    <input type="time" className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" value={s1.loadingTime} onChange={e => setS1({...s1, loadingTime: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm text-kaptan-muted mb-1">Teslim Tarihi *</label>
                    <input type="date" className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" value={s1.deliveryDate} onChange={e => setS1({...s1, deliveryDate: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm text-kaptan-muted mb-1">Teslim Saati</label>
                    <input type="time" className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" value={s1.deliveryTime} onChange={e => setS1({...s1, deliveryTime: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-kaptan-muted mb-1">Açıklama <span className="text-kaptan-muted text-xs">(max 300 karakter)</span></label>
                  <textarea className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" rows={2} maxLength={300}
                    value={s1.description} onChange={e => setS1({...s1, description: e.target.value})} />
                </div>
              </div>
            )}

            {/* ── STEP 2: YUK TURUNE OZEL ── */}
            {step === 2 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-2 bg-kaptan-primary/10 rounded-lg mb-2">
                  <Truck size={16} className="text-kaptan-primary" />
                  <span className="text-sm text-kaptan-primary font-medium">{s1.loadType} — Özel Alanlar</span>
                </div>

                {/* Tam Yük & Kısmi Yük: Araç + Dorse */}
                {(s1.loadType === 'Tam Yük' || s1.loadType === 'Kısmi Yük') && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-kaptan-muted mb-1">Araç Tipi</label>
                        <select className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text"
                          value={s2.vehicleType} onChange={e => setS2({...s2, vehicleType: e.target.value})}>
                          <option value="">Seçiniz</option>
                          {VEHICLE_OPTIONS[s1.loadType].map(v => <option key={v}>{v}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-kaptan-muted mb-1">Dorse Tipi</label>
                        <select className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text"
                          value={s2.trailerType} onChange={e => setS2({...s2, trailerType: e.target.value})}>
                          <option value="">Seçiniz</option>
                          {TRAILER_OPTIONS[s1.loadType].map(v => <option key={v}>{v}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm text-kaptan-muted mb-1">{s1.loadType === 'Tam Yük' ? 'Toplam Ağırlık (Kg)' : 'Toplam Ağırlık (Ton)'} *</label>
                        <input type="number" className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text"
                          value={s2.weight} onChange={e => setS2({...s2, weight: e.target.value})} />
                      </div>
                      {s1.loadType === 'Kısmi Yük' && (
                        <>
                          <div>
                            <label className="block text-sm text-kaptan-muted mb-1">Parça Sayısı *</label>
                            <input type="number" className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text"
                              value={s2.pieces} onChange={e => setS2({...s2, pieces: e.target.value})} />
                          </div>
                          <div>
                            <label className="block text-sm text-kaptan-muted mb-1">Hacim (m³) *</label>
                            <input type="number" step="0.1" className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text"
                              value={s2.volume} onChange={e => setS2({...s2, volume: e.target.value})} />
                          </div>
                        </>
                      )}
                    </div>

                    {s1.loadType === 'Tam Yük' && (
                      <div>
                        <label className="block text-sm text-kaptan-muted mb-1">Soğuk Zincir Gerekiyor mu?</label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 text-sm text-kaptan-text"><input type="radio" name="coldChain" checked={s2.coldChain} onChange={() => setS2({...s2, coldChain: true})} className="text-kaptan-primary" /> Evet</label>
                          <label className="flex items-center gap-2 text-sm text-kaptan-text"><input type="radio" name="coldChain" checked={!s2.coldChain} onChange={() => setS2({...s2, coldChain: false})} className="text-kaptan-primary" /> Hayır</label>
                        </div>
                      </div>
                    )}

                    {s1.loadType === 'Kısmi Yük' && (
                      <>
                        <div>
                          <label className="block text-sm text-kaptan-muted mb-1">Paket Tipi</label>
                          <select className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text"
                            value={s2.packageType} onChange={e => setS2({...s2, packageType: e.target.value})}>
                            <option value="">Seçiniz</option>
                            {PACKAGE_TYPES.map(p => <option key={p}>{p}</option>)}
                          </select>
                        </div>
                        <div className="flex gap-6">
                          <label className="flex items-center gap-2 text-sm text-kaptan-text"><input type="checkbox" checked={s2.sharedTransport} onChange={e => setS2({...s2, sharedTransport: e.target.checked})} className="rounded border-kaptan-border bg-kaptan-dark" /> Paylaşımlı Taşıma İzni</label>
                        </div>
                        <div>
                          <label className="block text-sm text-kaptan-muted mb-1">Yük Aciliyeti</label>
                          <div className="flex gap-4">
                            {['Düşük', 'Normal', 'Yüksek'].map(u => (
                              <label key={u} className="flex items-center gap-2 text-sm text-kaptan-text">
                                <input type="radio" name="urgency" checked={s2.urgency === u} onChange={() => setS2({...s2, urgency: u})} className="text-kaptan-primary" /> {u}
                              </label>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* Evden Eve */}
                {s1.loadType === 'Evden Eve' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-kaptan-muted mb-1">Araç Tipi</label>
                        <select className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text"
                          value={s2.vehicleType} onChange={e => setS2({...s2, vehicleType: e.target.value})}>
                          <option value="">Seçiniz</option>
                          {VEHICLE_OPTIONS['Evden Eve'].map(v => <option key={v}>{v}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-kaptan-muted mb-1">Dorse Tipi</label>
                        <select className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text"
                          value={s2.trailerType} onChange={e => setS2({...s2, trailerType: e.target.value})}>
                          <option value="">Seçiniz</option>
                          {TRAILER_OPTIONS['Evden Eve'].map(v => <option key={v}>{v}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-kaptan-muted mb-1">Taşıma Tipi</label>
                      <select className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text"
                        value={s2.transportType} onChange={e => setS2({...s2, transportType: e.target.value})}>
                        <option value="">Seçiniz</option>
                        {TRANSPORT_TYPES['Evden Eve'].map(v => <option key={v}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-kaptan-muted mb-1">Eşya Listesi</label>
                      <textarea className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" rows={2}
                        value={s2.itemList} onChange={e => setS2({...s2, itemList: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-kaptan-muted mb-1">Gönderen Kat</label>
                        <input type="number" className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text"
                          value={s2.senderFloor} onChange={e => setS2({...s2, senderFloor: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-sm text-kaptan-muted mb-1">Alıcı Kat</label>
                        <input type="number" className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text"
                          value={s2.receiverFloor} onChange={e => setS2({...s2, receiverFloor: e.target.value})} />
                      </div>
                    </div>
                    <div className="flex gap-6">
                      <label className="flex items-center gap-2 text-sm text-kaptan-text"><input type="checkbox" checked={s2.senderElevator} onChange={e => setS2({...s2, senderElevator: e.target.checked})} className="rounded border-kaptan-border bg-kaptan-dark" /> Gönderen Asansör</label>
                      <label className="flex items-center gap-2 text-sm text-kaptan-text"><input type="checkbox" checked={s2.receiverElevator} onChange={e => setS2({...s2, receiverElevator: e.target.checked})} className="rounded border-kaptan-border bg-kaptan-dark" /> Alıcı Asansör</label>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-kaptan-text"><input type="checkbox" checked={s2.packagingNeeded} onChange={e => setS2({...s2, packagingNeeded: e.target.checked})} className="rounded border-kaptan-border bg-kaptan-dark" /> Ambalaj/Paketleme Talebi</label>
                  </>
                )}

                {/* Şehir İçi */}
                {s1.loadType === 'Şehir İçi' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-kaptan-muted mb-1">Araç Tipi</label>
                        <select className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text"
                          value={s2.vehicleType} onChange={e => setS2({...s2, vehicleType: e.target.value})}>
                          <option value="">Seçiniz</option>
                          {VEHICLE_OPTIONS['Şehir İçi'].map(v => <option key={v}>{v}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-kaptan-muted mb-1">Taşıma Türü</label>
                        <select className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text"
                          value={s2.transportType} onChange={e => setS2({...s2, transportType: e.target.value})}>
                          <option value="">Seçiniz</option>
                          {TRANSPORT_TYPES['Şehir İçi'].map(v => <option key={v}>{v}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm text-kaptan-muted mb-1">Tahmini Mesafe (Km) *</label>
                        <input type="number" className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text"
                          value={s2.estimatedDistance} onChange={e => setS2({...s2, estimatedDistance: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-sm text-kaptan-muted mb-1">Teslimat Saat Aralığı</label>
                        <select className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text"
                          value={s2.deliveryTimeSlot} onChange={e => setS2({...s2, deliveryTimeSlot: e.target.value})}>
                          <option value="">Seçiniz</option>
                          {TIME_SLOTS.map(t => <option key={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-kaptan-muted mb-1">Yük Boyutu</label>
                        <select className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text"
                          value={s2.cargoSize} onChange={e => setS2({...s2, cargoSize: e.target.value})}>
                          <option value="">Seçiniz</option>
                          <option>Küçük</option><option>Orta</option><option>Büyük</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-kaptan-muted mb-1">Aciliyet Durumu</label>
                      <div className="flex gap-4">
                        {URGENCY_OPTIONS.map(u => (
                          <label key={u} className="flex items-center gap-2 text-sm text-kaptan-text">
                            <input type="radio" name="s2urgency" checked={s2.urgency === u} onChange={() => setS2({...s2, urgency: u})} className="text-kaptan-primary" /> {u}
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── STEP 3: FIYATLANDIRMA ── */}
            {step === 3 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-2 bg-kaptan-success/10 rounded-lg mb-2">
                  <Percent size={16} className="text-kaptan-success" />
                  <span className="text-sm text-kaptan-success font-medium">Fiyatlandırma, İhale ve Sigorta</span>
                </div>

                {/* İhale */}
                <div>
                  <label className="block text-sm text-kaptan-muted mb-1">Yük İhale Edilecek mi?</label>
                  <div className="flex gap-4 mb-2">
                    <label className="flex items-center gap-2 text-sm text-kaptan-text"><input type="radio" name="auction" checked={s3.auctionEnabled} onChange={() => setS3({...s3, auctionEnabled: true})} className="text-kaptan-primary" /> Evet</label>
                    <label className="flex items-center gap-2 text-sm text-kaptan-text"><input type="radio" name="auction" checked={!s3.auctionEnabled} onChange={() => setS3({...s3, auctionEnabled: false})} className="text-kaptan-primary" /> Hayır</label>
                  </div>
                  {s3.auctionEnabled && (
                    <div className="grid grid-cols-2 gap-3 p-3 bg-kaptan-dark rounded-lg">
                      <div><label className="text-xs text-kaptan-muted">Alt Limit (₺)</label><input type="number" className="w-full bg-kaptan-dark border border-kaptan-border rounded px-2 py-1.5 text-kaptan-text text-sm" value={s3.auctionMinPrice} onChange={e => setS3({...s3, auctionMinPrice: e.target.value})} /></div>
                      <div><label className="text-xs text-kaptan-muted">Üst Limit (₺)</label><input type="number" className="w-full bg-kaptan-dark border border-kaptan-border rounded px-2 py-1.5 text-kaptan-text text-sm" value={s3.auctionMaxPrice} onChange={e => setS3({...s3, auctionMaxPrice: e.target.value})} /></div>
                      <div><label className="text-xs text-kaptan-muted">Başlangıç Tarihi</label><input type="date" className="w-full bg-kaptan-dark border border-kaptan-border rounded px-2 py-1.5 text-kaptan-text text-sm" value={s3.auctionStartDate} onChange={e => setS3({...s3, auctionStartDate: e.target.value})} /></div>
                      <div><label className="text-xs text-kaptan-muted">Bitiş Tarihi</label><input type="date" className="w-full bg-kaptan-dark border border-kaptan-border rounded px-2 py-1.5 text-kaptan-text text-sm" value={s3.auctionEndDate} onChange={e => setS3({...s3, auctionEndDate: e.target.value})} /></div>
                    </div>
                  )}
                </div>

                {/* Fiyatlandırma Tipi */}
                <div>
                  <label className="block text-sm text-kaptan-muted mb-2">Fiyatlandırma Tipi</label>
                  <div className="flex gap-4 mb-3">
                    <label className="flex items-center gap-2 text-sm text-kaptan-text"><input type="radio" name="pricing" checked={s3.pricingType === 'tonnage'} onChange={() => setS3({...s3, pricingType: 'tonnage'})} className="text-kaptan-primary" /> Tonaj Bazlı</label>
                    <label className="flex items-center gap-2 text-sm text-kaptan-text"><input type="radio" name="pricing" checked={s3.pricingType === 'fixed'} onChange={() => setS3({...s3, pricingType: 'fixed'})} className="text-kaptan-primary" /> Komple / Adet Bazlı</label>
                  </div>
                  {s3.pricingType === 'tonnage' ? (
                    <div className="grid grid-cols-2 gap-3 p-3 bg-kaptan-dark rounded-lg">
                      <div><label className="text-xs text-kaptan-muted">Toplam Tonaj</label><input type="number" className="w-full bg-kaptan-dark border border-kaptan-border rounded px-2 py-1.5 text-kaptan-text text-sm" value={s3.tonnage} onChange={e => setS3({...s3, tonnage: e.target.value})} /></div>
                      <div><label className="text-xs text-kaptan-muted">Ton Başı Fiyat (₺)</label><input type="number" className="w-full bg-kaptan-dark border border-kaptan-border rounded px-2 py-1.5 text-kaptan-text text-sm" value={s3.pricePerTon} onChange={e => setS3({...s3, pricePerTon: e.target.value})} /></div>
                    </div>
                  ) : (
                    <div className="p-3 bg-kaptan-dark rounded-lg">
                      <label className="text-xs text-kaptan-muted">Komple Yük Fiyatı (₺)</label>
                      <input type="number" className="w-full bg-kaptan-dark border border-kaptan-border rounded px-2 py-1.5 text-kaptan-text text-sm" value={s3.price} onChange={e => setS3({...s3, price: e.target.value})} />
                    </div>
                  )}
                </div>

                {/* Diğer seçenekler */}
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center gap-2 text-sm text-kaptan-text"><input type="checkbox" checked={s3.cashOnDelivery} onChange={e => setS3({...s3, cashOnDelivery: e.target.checked})} className="rounded border-kaptan-border bg-kaptan-dark" /> Kapıda Ödeme</label>
                  <label className="flex items-center gap-2 text-sm text-kaptan-text"><input type="checkbox" checked={s3.insuranceEnabled} onChange={e => setS3({...s3, insuranceEnabled: e.target.checked})} className="rounded border-kaptan-border bg-kaptan-dark" /> Sigorta İstiyorum</label>
                  <label className="flex items-center gap-2 text-sm text-kaptan-text"><input type="checkbox" checked={s3.escrowEnabled} onChange={e => setS3({...s3, escrowEnabled: e.target.checked})} className="rounded border-kaptan-border bg-kaptan-dark" /> <Shield size={14} className="text-kaptan-success" /> Güvenli Ödeme (Escrow)</label>
                  <label className="flex items-center gap-2 text-sm text-kaptan-text"><input type="checkbox" checked={(s3 as any).instantBookEnabled} onChange={e => setS3({...s3, instantBookEnabled: e.target.checked} as any)} className="rounded border-kaptan-border bg-kaptan-dark" /> ⚡ Anında Rezervasyon (Pazarlıksız Hemen Al)</label>
                </div>

                {/* Fiyat Özeti */}
                <div className="bg-kaptan-dark border border-kaptan-border rounded-lg p-4 space-y-2">
                  <h4 className="text-sm font-semibold text-kaptan-text mb-2">Fiyat Özeti</h4>
                  <div className="flex justify-between text-sm"><span className="text-kaptan-muted">Net Tutar</span><span className="text-kaptan-text">{priceCalc.net.toFixed(2)} ₺</span></div>
                  <div className="flex justify-between text-sm"><span className="text-kaptan-muted">KDV (%20)</span><span className="text-kaptan-text">{priceCalc.kdv.toFixed(2)} ₺</span></div>
                  {s3.insuranceEnabled && <div className="flex justify-between text-sm"><span className="text-kaptan-muted">Sigorta</span><span className="text-kaptan-text">— ₺</span></div>}
                  <div className="flex justify-between text-sm font-bold pt-2 border-t border-kaptan-border"><span className="text-kaptan-text">Toplam Fiyat</span><span className="text-kaptan-primary text-lg">{priceCalc.total.toFixed(2)} ₺</span></div>
                  <div className="flex gap-2 mt-1">
                    {s3.escrowEnabled && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">Güvenli Ödeme</span>}
                    {s3.auctionEnabled && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">İhaleye Açık</span>}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-6 pt-4 border-t border-kaptan-border">
              <div>
                {step > 1 && (
                  <button onClick={() => setStep(step - 1)}
                    className="flex items-center gap-1 px-4 py-2 border border-kaptan-border rounded-lg text-kaptan-muted hover:text-kaptan-text">
                    <ChevronLeft size={16} /> Geri
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setShowForm(false); setEditingLoad(null); resetAll(); }}
                  className="px-4 py-2 border border-kaptan-border rounded-lg text-kaptan-muted hover:text-kaptan-text">İptal</button>
                {step < 3 ? (
                  <button onClick={() => setStep(step + 1)}
                    className="flex items-center gap-1 px-4 py-2 bg-kaptan-primary text-white rounded-lg hover:bg-kaptan-primary/90">
                    Devam Et <ChevronRight size={16} />
                  </button>
                ) : (
                  <button onClick={handleSubmit} disabled={saving}
                    className="flex items-center gap-2 px-6 py-2 bg-kaptan-primary text-white rounded-lg hover:bg-kaptan-primary/90 disabled:opacity-50">
                    <CheckCircle size={16} /> {saving ? 'Kaydediliyor...' : 'Yükü Listele'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
