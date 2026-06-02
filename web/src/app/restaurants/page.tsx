'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Plus, Search, Edit, Trash2, MapPin, Star, Clock, Phone, Utensils, Menu as MenuIcon, Coffee, X } from 'lucide-react';

const MENU_CATEGORIES = ['Çorba', 'Ana Yemek', 'Izgara', 'Tatlı', 'İçecek', 'Salata', 'Kahvaltı', 'Ara Sıcak'];

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [showReviews, setShowReviews] = useState<string | null>(null);
  // Menu management
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [showMenuItemForm, setShowMenuItemForm] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<any>(null);
  const [menuForm, setMenuForm] = useState({ name: '', price: '', category: '', description: '', isDailySpecial: false, isPopular: false, isDiscounted: false });
  // Reservations
  const [showReservations, setShowReservations] = useState<string | null>(null);
  const [reservations, setReservations] = useState<any[]>([]);

  const [form, setForm] = useState({
    name: '', city: '', district: '', address: '', phone: '', email: '', description: '',
    lat: '', lng: '', hasTruckPark: false, truckParkCapacity: '',
  });

  const fetchRestaurants = async () => {
    setLoading(true);
    try { const res = await api.get('/restaurants'); setRestaurants(Array.isArray(res.data?.data?.data || res.data?.data) ? (res.data?.data?.data || res.data?.data) : []); } catch { setRestaurants([]); }
    setLoading(false);
  };
  useEffect(() => { fetchRestaurants(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const payload = { ...form, latitude: parseFloat(form.lat), longitude: parseFloat(form.lng), truckParkCapacity: parseInt(form.truckParkCapacity) || 0 };
    try {
      if (editing) await api.put(`/restaurants/${editing.id}`, payload);
      else await api.post('/restaurants', payload);
      setShowForm(false); setEditing(null); resetForm(); fetchRestaurants();
    } catch (err: any) { alert(err.response?.data?.message || 'Hata'); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Silmek istediğinize emin misiniz?')) return;
    try { await api.delete(`/restaurants/${id}`); fetchRestaurants(); } catch (err: any) { alert(err.response?.data?.message || 'Silme hatası'); }
  };

  // Menu CRUD
  const fetchMenuItems = async (restaurantId: string) => {
    try {
      const res = await api.get(`/restaurants/${restaurantId}/menu`);
      setMenuItems(Array.isArray(res.data?.data?.data || res.data?.data) ? (res.data?.data?.data || res.data?.data) : []);
      setShowMenu(restaurantId);
    } catch { setMenuItems([]); }
  };

  const handleMenuSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editingMenuItem) await api.put(`/restaurants/${showMenu}/menu/${editingMenuItem.id}`, menuForm);
      else await api.post(`/restaurants/${showMenu}/menu`, menuForm);
      setShowMenuItemForm(false); setEditingMenuItem(null); fetchMenuItems(showMenu!);
    } catch (err: any) { alert(err.response?.data?.message || 'Hata'); }
    setSaving(false);
  };

  const handleMenuDelete = async (itemId: string) => {
    if (!confirm('Bu menü öğesini silmek istediğinize emin misiniz?')) return;
    try { await api.delete(`/restaurants/${showMenu}/menu/${itemId}`); fetchMenuItems(showMenu!); } catch {}
  };

  const fetchReviews = async (id: string) => {
    try { const res = await api.get(`/restaurants/${id}/reviews`); setReviews(res.data?.data?.data || res.data?.data || []); setShowReviews(id); } catch { setReviews([]); }
  };

  const fetchReservations = async (id: string) => {
    try { const res = await api.get(`/restaurants/${id}/reservations`); setReservations(res.data?.data?.data || res.data?.data || []); setShowReservations(id); } catch { setReservations([]); }
  };

  const resetForm = () => setForm({ name: '', city: '', district: '', address: '', phone: '', email: '', description: '', lat: '', lng: '', hasTruckPark: false, truckParkCapacity: '' });

  const filtered = restaurants.filter((r: any) => !search || r.name?.toLowerCase().includes(search.toLowerCase()) || r.city?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-kaptan-text">Lokantalar & Yeme-İçme</h2>
        <button onClick={() => { resetForm(); setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-kaptan-primary text-white px-4 py-2 rounded-lg hover:bg-kaptan-primary/90"><Plus size={18} /> Lokanta Ekle</button>
      </div>

      <div className="mb-4 relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-kaptan-muted" />
        <input className="w-full glass-card pl-10 pr-4 py-2.5 text-kaptan-text placeholder-kaptan-muted"
          placeholder="Lokanta, şehir ara..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{[1,2,3,4].map(i => <div key={i} className="h-28 skeleton rounded-xl" />)}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((r: any) => (
            <div key={r.id} className="glass-card p-4 hover:border-kaptan-primary/30 transition-colors">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-kaptan-text">{r.name}</h3>
                  <div className="flex items-center gap-1 text-xs text-kaptan-muted mt-1"><MapPin size={12} /> {r.city}{r.district ? ` / ${r.district}` : ''}</div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-kaptan-muted">
                    {r.rating && <span className="flex items-center gap-1"><Star size={12} className="text-kaptan-warning" />{Number(r.rating).toFixed(1)}</span>}
                    {r.phone && <span className="flex items-center gap-1"><Phone size={12} />{r.phone}</span>}
                  </div>
                  {r.hasTruckPark && <span className="inline-block mt-2 text-xs bg-kaptan-success/20 text-kaptan-success px-2 py-0.5 rounded">TIR Otoparkı ({r.truckParkCapacity || '?'})</span>}
                </div>
                <div className="flex gap-1 flex-wrap justify-end">
                  <button onClick={() => fetchMenuItems(r.id)} className="px-2 py-1 text-xs bg-kaptan-primary/10 text-kaptan-primary rounded hover:bg-kaptan-primary/20"><MenuIcon size={12} /> Menü</button>
                  <button onClick={() => fetchReservations(r.id)} className="px-2 py-1 text-xs bg-blue-500/10 text-blue-400 rounded hover:bg-blue-500/20"><Clock size={12} /> Rezervasyon</button>
                  <button onClick={() => fetchReviews(r.id)} className="px-2 py-1 text-xs bg-yellow-500/10 text-yellow-400 rounded hover:bg-yellow-500/20"><Star size={12} /> Yorum</button>
                  <button onClick={() => { setForm({ name: r.name || '', city: r.city || '', district: r.district || '', address: r.address || '', phone: r.phone || '', email: r.email || '', description: r.description || '', lat: r.latitude?.toString() || '', lng: r.longitude?.toString() || '', hasTruckPark: r.hasTruckPark || false, truckParkCapacity: r.truckParkCapacity?.toString() || '' }); setEditing(r); setShowForm(true); }}
                    className="p-1.5 hover:bg-kaptan-primary/20 rounded text-kaptan-primary"><Edit size={14} /></button>
                  <button onClick={() => handleDelete(r.id)} className="p-1.5 hover:bg-kaptan-danger/20 rounded text-kaptan-danger"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="col-span-2 text-center py-12 text-kaptan-muted">Henüz lokanta bulunmuyor</div>}
        </div>
      )}

      {/* Menu Management Modal */}
      {showMenu && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center pt-10 z-50">
          <div className="glass-card rounded-2xl p-6 w-full max-w-xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-kaptan-text">Menü Yönetimi</h3>
              <button onClick={() => setShowMenu(null)} className="text-kaptan-muted hover:text-kaptan-text"><X size={18} /></button>
            </div>
            <button onClick={() => { setMenuForm({ name: '', price: '', category: '', description: '', isDailySpecial: false, isPopular: false, isDiscounted: false }); setEditingMenuItem(null); setShowMenuItemForm(true); }}
              className="flex items-center gap-1 px-3 py-1.5 bg-kaptan-primary text-white rounded-lg text-sm mb-4 hover:bg-kaptan-primary/90"><Plus size={14} /> Yemek Ekle</button>
            {menuItems.length === 0 ? <p className="text-kaptan-muted text-sm text-center py-6">Henüz menü öğesi eklenmemiş</p> : (
              <div className="space-y-2">
                {menuItems.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between bg-kaptan-dark rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <Coffee size={16} className="text-kaptan-primary" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-kaptan-text font-medium text-sm">{item.name}</span>
                          {item.isPopular && <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">Popüler</span>}
                          {item.isDailySpecial && <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">Günün Menüsü</span>}
                        </div>
                        <span className="text-xs text-kaptan-muted">{item.category} • {item.description?.slice(0, 40)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-kaptan-text font-medium text-sm">{Number(item.price || 0).toFixed(2)} ₺</span>
                      <button onClick={() => { setMenuForm({ name: item.name, price: item.price?.toString() || '', category: item.category || '', description: item.description || '', isDailySpecial: item.isDailySpecial, isPopular: item.isPopular, isDiscounted: item.isDiscounted }); setEditingMenuItem(item); setShowMenuItemForm(true); }}
                        className="p-1 hover:bg-kaptan-primary/20 rounded text-kaptan-primary"><Edit size={12} /></button>
                      <button onClick={() => handleMenuDelete(item.id)} className="p-1 hover:bg-kaptan-danger/20 rounded text-kaptan-danger"><Trash2 size={12} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Menu Item Form Modal */}
      {showMenuItemForm && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center pt-16 z-[60]">
          <div className="glass-card rounded-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="font-semibold text-kaptan-text mb-3">{editingMenuItem ? 'Yemek Düzenle' : 'Yemek Ekle'}</h3>
            <form onSubmit={handleMenuSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-kaptan-muted mb-1">Yemek Adı *</label>
                <input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text text-sm" required value={menuForm.name} onChange={e => setMenuForm({...menuForm, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-kaptan-muted mb-1">Fiyat (₺) *</label>
                  <input type="number" step="0.01" className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text text-sm" required value={menuForm.price} onChange={e => setMenuForm({...menuForm, price: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs text-kaptan-muted mb-1">Kategori</label>
                  <select className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text text-sm" value={menuForm.category} onChange={e => setMenuForm({...menuForm, category: e.target.value})}>
                    <option value="">Seçiniz</option>
                    {MENU_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-kaptan-muted mb-1">Açıklama</label>
                <input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text text-sm" value={menuForm.description} onChange={e => setMenuForm({...menuForm, description: e.target.value})} />
              </div>
              <div className="flex gap-4 flex-wrap">
                <label className="flex items-center gap-1 text-xs text-kaptan-text"><input type="checkbox" checked={menuForm.isDailySpecial} onChange={e => setMenuForm({...menuForm, isDailySpecial: e.target.checked})} className="rounded border-kaptan-border bg-kaptan-dark" /> Günün Menüsü</label>
                <label className="flex items-center gap-1 text-xs text-kaptan-text"><input type="checkbox" checked={menuForm.isPopular} onChange={e => setMenuForm({...menuForm, isPopular: e.target.checked})} className="rounded border-kaptan-border bg-kaptan-dark" /> Popüler</label>
                <label className="flex items-center gap-1 text-xs text-kaptan-text"><input type="checkbox" checked={menuForm.isDiscounted} onChange={e => setMenuForm({...menuForm, isDiscounted: e.target.checked})} className="rounded border-kaptan-border bg-kaptan-dark" /> İndirimli</label>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => { setShowMenuItemForm(false); setEditingMenuItem(null); }} className="px-3 py-1.5 border border-kaptan-border rounded-lg text-kaptan-muted text-sm">İptal</button>
                <button type="submit" disabled={saving} className="px-3 py-1.5 bg-kaptan-primary text-white rounded-lg text-sm disabled:opacity-50">{saving ? '...' : 'Kaydet'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reviews Modal */}
      {showReviews && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl p-6 w-full max-w-lg max-h-[70vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-kaptan-text">Yorumlar ({reviews.length})</h3>
              <button onClick={() => setShowReviews(null)} className="text-kaptan-muted hover:text-kaptan-text"><X size={18} /></button>
            </div>
            {reviews.length === 0 ? <p className="text-kaptan-muted text-sm text-center py-8">Henüz yorum yok</p> : (
              <div className="space-y-3">
                {reviews.map((rev: any) => (
                  <div key={rev.id} className="bg-kaptan-dark rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-kaptan-warning text-sm">{'★'.repeat(Math.round(rev.rating || 0))}{'☆'.repeat(5 - Math.round(rev.rating || 0))}</span>
                      <span className="text-xs text-kaptan-muted">{new Date(rev.createdAt).toLocaleDateString('tr-TR')}</span>
                    </div>
                    <p className="text-sm text-kaptan-text mt-1">{rev.text || rev.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reservations Modal */}
      {showReservations && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl p-6 w-full max-w-lg max-h-[70vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-kaptan-text">Rezervasyonlar ({reservations.length})</h3>
              <button onClick={() => setShowReservations(null)} className="text-kaptan-muted hover:text-kaptan-text"><X size={18} /></button>
            </div>
            {reservations.length === 0 ? <p className="text-kaptan-muted text-sm text-center py-8">Rezervasyon bulunmuyor</p> : (
              <div className="space-y-3">
                {reservations.map((res: any) => (
                  <div key={res.id} className="bg-kaptan-dark rounded-lg p-3 flex justify-between items-center">
                    <div>
                      <span className="text-kaptan-text font-medium text-sm">{res.customerName || 'Misafir'}</span>
                      <p className="text-xs text-kaptan-muted">{res.date ? new Date(res.date).toLocaleString('tr-TR') : '-'} • {res.guests || 1} kişi</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded ${res.status === 'confirmed' ? 'bg-green-500/20 text-green-400' : res.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-500/20 text-gray-400'}`}>
                      {res.status === 'confirmed' ? 'Onaylandı' : res.status === 'pending' ? 'Bekliyor' : res.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Restaurant Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center pt-10 z-50 overflow-y-auto">
          <div className="glass-card rounded-2xl p-6 w-full max-w-lg mx-4">
            <h3 className="text-lg font-semibold text-kaptan-text mb-4">{editing ? 'Lokanta Düzenle' : 'Yeni Lokanta'}</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div><label className="block text-sm text-kaptan-muted mb-1">İşletme Adı *</label><input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm text-kaptan-muted mb-1">İl *</label><input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" required value={form.city} onChange={e => setForm({...form, city: e.target.value})} /></div>
                <div><label className="block text-sm text-kaptan-muted mb-1">İlçe</label><input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" value={form.district} onChange={e => setForm({...form, district: e.target.value})} /></div>
              </div>
              <div><label className="block text-sm text-kaptan-muted mb-1">Adres *</label><input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" required value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-sm text-kaptan-muted mb-1">Telefon</label><input className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                <div><label className="block text-sm text-kaptan-muted mb-1">Enlem</label><input type="number" step="any" className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" value={form.lat} onChange={e => setForm({...form, lat: e.target.value})} /></div>
                <div><label className="block text-sm text-kaptan-muted mb-1">Boylam</label><input type="number" step="any" className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" value={form.lng} onChange={e => setForm({...form, lng: e.target.value})} /></div>
              </div>
              <div><label className="block text-sm text-kaptan-muted mb-1">Açıklama</label><textarea className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-3 py-2 text-kaptan-text" rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-kaptan-text"><input type="checkbox" checked={form.hasTruckPark} onChange={e => setForm({...form, hasTruckPark: e.target.checked})} className="rounded border-kaptan-border bg-kaptan-dark" /> TIR Otoparkı</label>
                {form.hasTruckPark && <div><label className="text-xs text-kaptan-muted">Kapasite</label><input type="number" className="w-20 bg-kaptan-dark border border-kaptan-border rounded-lg px-2 py-1.5 text-kaptan-text text-sm" value={form.truckParkCapacity} onChange={e => setForm({...form, truckParkCapacity: e.target.value})} /></div>}
              </div>
              <div className="flex gap-3 justify-end pt-3">
                <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="px-4 py-2 border border-kaptan-border rounded-lg text-kaptan-muted">İptal</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-kaptan-primary text-white rounded-lg disabled:opacity-50">{saving ? '...' : 'Kaydet'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
