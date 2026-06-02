'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Shield, UserPlus } from 'lucide-react';

export default function AdminsPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users').then((res) => {
      const list = res.data?.data?.data || res.data?.data || [];
      setUsers(Array.isArray(list) ? list.filter((u: any) =>
        ['super_admin', 'admin', 'platform_operatoru'].includes(u.role)
      ) : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const roleLabels: Record<string, string> = {
    super_admin: 'Süper Admin', admin: 'Admin', platform_operatoru: 'Operatör',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shield size={24} className="text-kaptan-primary" />
          <h2 className="text-2xl font-bold text-kaptan-text">Admin Yönetimi</h2>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-kaptan-primary text-white rounded-lg text-sm font-medium">
          <UserPlus size={16} /> Yeni Admin Ekle
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 skeleton rounded-lg" />)}</div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-kaptan-dark/50 border-b border-kaptan-border">
              <tr className="text-left text-kaptan-muted">
                <th className="px-4 py-3">Admin</th><th className="px-4 py-3">E-posta</th>
                <th className="px-4 py-3">Rol</th><th className="px-4 py-3">Yetkiler</th>
                <th className="px-4 py-3">Durum</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-kaptan-border/50">
                  <td className="px-4 py-3 text-kaptan-text font-medium">{u.fullName}</td>
                  <td className="px-4 py-3 text-kaptan-muted">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 text-xs rounded-full bg-kaptan-primary/10 text-kaptan-primary">
                      {roleLabels[u.role] || u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-kaptan-muted text-xs">
                    {u.role === 'super_admin' ? 'Tüm yetkiler' : u.role === 'admin' ? 'Panel, Kullanıcı, Finans' : 'İzleme'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${u.isActive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                      {u.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
