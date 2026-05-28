'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { ArrowLeft, Mail, Phone, Shield, Calendar } from 'lucide-react';
import Link from 'next/link';

export default function UserDetailPage() {
  const { id } = useParams();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    api.get('/users').then((res) => {
      const list = res.data?.data?.data || res.data?.data || [];
      setUser(list.find((u: any) => u.id === id));
    });
  }, [id]);

  if (!user) return <div className="p-8 text-kaptan-muted">Yükleniyor...</div>;

  const roleLabels: Record<string, string> = {
    super_admin: 'Süper Admin', admin: 'Admin', yuk_veren: 'Yük Veren',
    tasiyici: 'Taşıyıcı', sofor: 'Şoför', isletme: 'İşletme', genel: 'Genel',
  };

  return (
    <div>
      <Link href="/users" className="flex items-center gap-2 text-kaptan-primary hover:underline mb-6 text-sm">
        <ArrowLeft size={16} /> Kullanıcı Listesine Dön
      </Link>
      <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-kaptan-primary/20 flex items-center justify-center text-2xl font-bold text-kaptan-primary">
            {user.fullName?.charAt(0) || '?'}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-kaptan-text">{user.fullName}</h2>
            <span className="px-2 py-1 text-xs rounded-full bg-kaptan-primary/10 text-kaptan-primary">
              {roleLabels[user.role] || user.role}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-4 bg-kaptan-dark rounded-lg">
            <Mail size={18} className="text-kaptan-muted" />
            <div><span className="text-xs text-kaptan-muted">E-posta</span><p className="text-kaptan-text">{user.email}</p></div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-kaptan-dark rounded-lg">
            <Phone size={18} className="text-kaptan-muted" />
            <div><span className="text-xs text-kaptan-muted">Telefon</span><p className="text-kaptan-text">{user.phone || '-'}</p></div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-kaptan-dark rounded-lg">
            <Shield size={18} className="text-kaptan-muted" />
            <div><span className="text-xs text-kaptan-muted">Durum</span>
              <p className={user.isActive ? 'text-kaptan-success' : 'text-kaptan-danger'}>
                {user.isActive ? 'Aktif' : 'Pasif'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-kaptan-dark rounded-lg">
            <Calendar size={18} className="text-kaptan-muted" />
            <div><span className="text-xs text-kaptan-muted">Kayıt Tarihi</span>
              <p className="text-kaptan-text">{new Date(user.createdAt).toLocaleDateString('tr-TR')}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button className="px-4 py-2 bg-kaptan-warning/10 text-kaptan-warning rounded-lg text-sm font-medium hover:bg-kaptan-warning/20">
            {user.isActive ? 'Hesabı Dondur' : 'Hesabı Aktifleştir'}
          </button>
          <button className="px-4 py-2 bg-kaptan-danger/10 text-kaptan-danger rounded-lg text-sm font-medium hover:bg-kaptan-danger/20">
            Rol Değiştir
          </button>
        </div>
      </div>
    </div>
  );
}
