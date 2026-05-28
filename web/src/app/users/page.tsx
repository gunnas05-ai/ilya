'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Search, Ban, Shield, UserPlus, UserX, Edit, Eye, FileCheck, XCircle } from 'lucide-react';

interface User {
  id: string; email: string; fullName: string; phone: string; role: string;
  isActive: boolean; isPhoneVerified: boolean; profileStatus: string;
  companyTitle?: string; plateNumber?: string; createdAt: string;
  kBelgesi?: string; srcBelgesi?: string; taxNumber?: string;
}

const ALL_ROLES: Record<string, string> = {
  super_admin: 'Süper Admin', admin: 'Admin', yuk_veren: 'Yük Veren',
  tasiyici: 'Taşıyıcı', sofor: 'Şoför', isletme: 'İşletme',
  filo_yoneticisi: 'Filo Yöneticisi', muhasebe: 'Muhasebe',
  operasyon: 'Operasyon', genel: 'Genel',
  platform_operatoru: 'Platform Operatörü', dispute_moderator: 'Hakem',
  marketplace_satici: 'Pazar Satıcı', marketplace_alici: 'Pazar Alıcı',
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = () => {
    setLoading(true);
    api.get('/users').then((res) => {
      const list = res.data?.data?.data || res.data?.data || [];
      setUsers(Array.isArray(list) ? list : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleToggleBan = async (user: User) => {
    const action = user.isActive ? 'devre dışı bırak' : 'aktifleştir';
    if (!confirm(`${user.fullName} kullanıcısını ${action}mak istediğinize emin misiniz?`)) return;
    setActionLoading(user.id);
    try {
      await api.patch(`/users/${user.id}/status`, { isActive: !user.isActive });
      fetchUsers();
    } catch (err: any) { alert(err.response?.data?.message || 'Hata'); }
    setActionLoading(null);
  };

  const handleRoleChange = async (user: User, newRole: string) => {
    if (!confirm(`${user.fullName} rolünü "${ALL_ROLES[newRole] || newRole}" olarak değiştirmek istediğinize emin misiniz?`)) return;
    setActionLoading(user.id);
    try {
      await api.patch(`/users/${user.id}/role`, { role: newRole });
      fetchUsers();
    } catch (err: any) { alert(err.response?.data?.message || 'Hata'); }
    setActionLoading(null);
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`${user.fullName} kullanıcısını SİLMEK istediğinize emin misiniz? Bu işlem geri alınamaz!`)) return;
    setActionLoading(user.id);
    try {
      await api.delete(`/users/${user.id}`);
      fetchUsers();
    } catch (err: any) { alert(err.response?.data?.message || 'Hata'); }
    setActionLoading(null);
  };

  const filtered = users.filter((u) => {
    const matchSearch = !search || u.fullName?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()) || u.phone?.includes(search);
    const matchRole = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-kaptan-text">Kullanıcı Yönetimi</h2>
        <span className="text-sm text-kaptan-muted">{users.length} kullanıcı • {users.filter(u => u.isActive).length} aktif • {users.filter(u => !u.isActive).length} pasif</span>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-3 text-kaptan-muted" />
          <input className="w-full bg-kaptan-card border border-kaptan-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-kaptan-text placeholder-kaptan-muted"
            placeholder="İsim, e-posta veya telefon ile ara..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="bg-kaptan-card border border-kaptan-border rounded-lg px-3 py-2 text-sm text-kaptan-text"
          value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">Tüm Roller</option>
          {Object.entries(ALL_ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Toplam', value: users.length, color: 'text-kaptan-text' },
          { label: 'Aktif', value: users.filter(u => u.isActive).length, color: 'text-kaptan-success' },
          { label: 'Doğrulanmamış', value: users.filter(u => u.profileStatus === 'INCOMPLETE' || u.profileStatus === 'PENDING_REVIEW').length, color: 'text-kaptan-warning' },
          { label: 'Engelli', value: users.filter(u => !u.isActive).length, color: 'text-kaptan-danger' },
        ].map((stat) => (
          <div key={stat.label} className="bg-kaptan-card border border-kaptan-border rounded-xl p-3 text-center">
            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-kaptan-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-kaptan-card rounded-lg animate-pulse" />)}</div>
      ) : (
        <div className="bg-kaptan-card border border-kaptan-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-kaptan-dark/50 border-b border-kaptan-border">
              <tr className="text-left text-kaptan-muted">
                <th className="px-4 py-3 font-medium">Kullanıcı</th>
                <th className="px-4 py-3 font-medium">E-posta / Tel</th>
                <th className="px-4 py-3 font-medium">Rol</th>
                <th className="px-4 py-3 font-medium">Profil</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 font-medium">Kayıt</th>
                <th className="px-4 py-3 font-medium">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 50).map((u) => (
                <tr key={u.id} className="border-b border-kaptan-border/50 hover:bg-kaptan-dark/20">
                  <td className="px-4 py-3 text-kaptan-text font-medium">
                    <button onClick={() => { setSelectedUser(u); setShowDetail(true); }}
                      className="hover:text-kaptan-primary text-left">
                      {u.fullName}
                      {u.companyTitle && <span className="block text-xs text-kaptan-muted">{u.companyTitle}</span>}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-kaptan-muted text-xs">{u.email}</span>
                    <span className="block text-kaptan-muted text-xs">{u.phone}</span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="bg-kaptan-dark border border-kaptan-border rounded px-2 py-1 text-xs text-kaptan-text"
                      value={u.role}
                      onChange={(e) => handleRoleChange(u, e.target.value)}
                      disabled={actionLoading === u.id || u.role === 'super_admin'}
                    >
                      {Object.entries(ALL_ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                      u.profileStatus === 'VERIFIED' ? 'bg-green-500/10 text-green-400' :
                      u.profileStatus === 'PENDING_REVIEW' ? 'bg-yellow-500/10 text-yellow-400' :
                      u.profileStatus === 'SUSPENDED' ? 'bg-red-500/10 text-red-400' :
                      'bg-gray-500/10 text-gray-400'
                    }`}>
                      {u.profileStatus === 'VERIFIED' ? 'Doğrulandı' :
                       u.profileStatus === 'PENDING_REVIEW' ? 'İncelemede' :
                       u.profileStatus === 'SUSPENDED' ? 'Askıda' :
                       u.profileStatus === 'INCOMPLETE' ? 'Eksik' : u.profileStatus || 'Eksik'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${u.isActive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                      {u.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-kaptan-muted text-xs">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString('tr-TR') : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => { setSelectedUser(u); setShowDetail(true); }}
                        className="p-1.5 hover:bg-kaptan-primary/20 rounded text-kaptan-primary" title="Detay"><Eye size={14} /></button>
                      {u.role !== 'super_admin' && (
                        <>
                          <button onClick={() => handleToggleBan(u)} disabled={actionLoading === u.id}
                            className={`p-1.5 rounded ${u.isActive ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-green-500/20 text-green-400'}`}
                            title={u.isActive ? 'Engelle' : 'Aktifleştir'}>
                            {u.isActive ? <Ban size={14} /> : <Shield size={14} />}
                          </button>
                          <button onClick={() => handleDelete(u)} disabled={actionLoading === u.id}
                            className="p-1.5 hover:bg-kaptan-danger/20 rounded text-kaptan-danger" title="Sil">
                            <UserX size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* User Detail Modal */}
      {showDetail && selectedUser && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center pt-10 z-50 overflow-y-auto">
          <div className="bg-kaptan-card border border-kaptan-border rounded-2xl p-6 w-full max-w-lg mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-kaptan-text">Kullanıcı Detayı</h3>
              <button onClick={() => { setShowDetail(false); setSelectedUser(null); }}
                className="text-kaptan-muted hover:text-kaptan-text"><XCircle size={20} /></button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-kaptan-muted">Ad Soyad</span><p className="text-kaptan-text font-medium">{selectedUser.fullName}</p></div>
                <div><span className="text-kaptan-muted">Rol</span><p className="text-kaptan-text">{ALL_ROLES[selectedUser.role] || selectedUser.role}</p></div>
                <div><span className="text-kaptan-muted">E-posta</span><p className="text-kaptan-text">{selectedUser.email}</p></div>
                <div><span className="text-kaptan-muted">Telefon</span><p className="text-kaptan-text">{selectedUser.phone}</p></div>
                {selectedUser.companyTitle && <div><span className="text-kaptan-muted">Firma</span><p className="text-kaptan-text">{selectedUser.companyTitle}</p></div>}
                {selectedUser.taxNumber && <div><span className="text-kaptan-muted">Vergi No</span><p className="text-kaptan-text">{selectedUser.taxNumber}</p></div>}
                {selectedUser.plateNumber && <div><span className="text-kaptan-muted">Plaka</span><p className="text-kaptan-text">{selectedUser.plateNumber}</p></div>}
                {selectedUser.kBelgesi && <div><span className="text-kaptan-muted">K Belgesi</span><p className="text-kaptan-text">{selectedUser.kBelgesi}</p></div>}
                {selectedUser.srcBelgesi && <div><span className="text-kaptan-muted">SRC Belgesi</span><p className="text-kaptan-text">{selectedUser.srcBelgesi}</p></div>}
                <div><span className="text-kaptan-muted">Profil Durumu</span>
                  <p className={`font-medium ${selectedUser.profileStatus === 'VERIFIED' ? 'text-kaptan-success' : selectedUser.profileStatus === 'PENDING_REVIEW' ? 'text-kaptan-warning' : 'text-kaptan-muted'}`}>
                    {selectedUser.profileStatus === 'VERIFIED' ? 'Doğrulandı' : selectedUser.profileStatus === 'PENDING_REVIEW' ? 'İncelemede' : selectedUser.profileStatus === 'SUSPENDED' ? 'Askıda' : 'Eksik'}
                  </p></div>
                <div><span className="text-kaptan-muted">Telefon Doğrulama</span>
                  <p className={selectedUser.isPhoneVerified ? 'text-kaptan-success' : 'text-kaptan-danger'}>{selectedUser.isPhoneVerified ? 'Doğrulandı' : 'Doğrulanmadı'}</p></div>
                <div><span className="text-kaptan-muted">Kayıt Tarihi</span><p className="text-kaptan-text">{new Date(selectedUser.createdAt).toLocaleString('tr-TR')}</p></div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              {selectedUser.role !== 'super_admin' && (
                <>
                  <button onClick={() => { handleToggleBan(selectedUser); setShowDetail(false); }}
                    className={`px-3 py-1.5 text-sm rounded-lg ${selectedUser.isActive ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'}`}>
                    {selectedUser.isActive ? '🔒 Hesabı Dondur' : '✅ Hesabı Aktifleştir'}
                  </button>
                </>
              )}
              <button onClick={() => setShowDetail(false)}
                className="px-4 py-1.5 border border-kaptan-border rounded-lg text-kaptan-muted text-sm">Kapat</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
