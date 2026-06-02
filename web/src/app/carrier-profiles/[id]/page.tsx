'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ArrowLeft, User, Phone, Mail, Truck, Shield, FileCheck, Award, Star, TrendingUp, AlertTriangle, CheckCircle, XCircle, Eye } from 'lucide-react';

export default function CarrierProfileDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [scorecard, setScorecard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get(`/users/${id}`).then(r => r.data?.data || r.data),
      api.get(`/carrier-quality/scorecard/${id}`).catch(() => null),
    ]).then(([p, s]) => { setProfile(p); if (s?.data?.data || s?.data) setScorecard(s.data?.data || s.data); }).catch(()=>{}).finally(()=>setLoading(false));
  }, [id]);

  const handleVerifyField = async (field: string) => {
    setVerifying(field);
    try { await api.patch(`/users/${id}/verify`, { field }); const r = await api.get(`/users/${id}`); setProfile(r.data?.data || r.data); } catch { alert('İşlem başarısız'); }
    setVerifying(null);
  };

  if (loading) return <div className="p-6 space-y-4"><div className="h-8 bg-kaptan-card animate-pulse rounded w-1/3" /><div className="h-64 bg-kaptan-card animate-pulse rounded" /></div>;
  if (!profile) return <div className="p-6 text-center text-kaptan-muted">Profil bulunamadı</div>;

  const verifyFields = [
    { key: 'identity', label: 'Kimlik Doğrulama', value: profile.identityVerified || profile.isPhoneVerified },
    { key: 'src', label: 'SRC Belgesi', value: profile.srcBelgesi },
    { key: 'k', label: 'K Belgesi', value: profile.kBelgesi },
    { key: 'plate', label: 'Plaka', value: profile.plateNumber },
    { key: 'escrow', label: 'Escrow Hesabı', value: profile.iban },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <button onClick={()=>router.back()} className="flex items-center gap-2 text-kaptan-muted hover:text-kaptan-text"><ArrowLeft size={18} /> Geri</button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-kaptan-text">{profile.fullName}</h1>
          <p className="text-kaptan-muted text-sm flex items-center gap-2 mt-1"><Mail size={14} /> {profile.email} {profile.phone && <><Phone size={14} /> {profile.phone}</>}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${profile.isActive?'bg-kaptan-success/20 text-kaptan-success':'bg-kaptan-danger/20 text-kaptan-danger'}`}>{profile.isActive?'Aktif':'Pasif'}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Company & Vehicle Info */}
          <div className="kaptan-card p-6">
            <h3 className="font-bold text-kaptan-text mb-4 flex items-center gap-2"><Truck size={18} /> Firma & Araç Bilgileri</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {profile.companyTitle && <D label="Firma" value={profile.companyTitle} />}
              {profile.plateNumber && <D label="Plaka" value={profile.plateNumber} />}
              {profile.vehicleType && <D label="Araç Tipi" value={profile.vehicleType} />}
              {profile.tonnageCapacity && <D label="Kapasite" value={`${profile.tonnageCapacity} ton`} />}
              {profile.taxNumber && <D label="Vergi No" value={profile.taxNumber} />}
              {profile.taxOffice && <D label="Vergi Dairesi" value={profile.taxOffice} />}
            </div>
          </div>

          {/* Document Verification */}
          <div className="kaptan-card p-6">
            <h3 className="font-bold text-kaptan-text mb-4 flex items-center gap-2"><FileCheck size={18} /> Belge Doğrulama</h3>
            <div className="space-y-2">
              {verifyFields.map(f => (
                <div key={f.key} className="flex items-center justify-between p-3 bg-kaptan-dark rounded-lg">
                  <div className="flex items-center gap-3">
                    {f.value ? <CheckCircle size={18} className="text-kaptan-success" /> : <XCircle size={18} className="text-kaptan-danger" />}
                    <div><p className="text-kaptan-text text-sm font-medium">{f.label}</p><p className="text-kaptan-muted text-xs">{typeof f.value === 'string' ? f.value : f.value ? 'Doğrulandı' : 'Doğrulanmadı'}</p></div>
                  </div>
                  <button onClick={()=>handleVerifyField(f.key)} disabled={verifying===f.key} className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${f.value?'bg-kaptan-danger/20 text-kaptan-danger hover:bg-kaptan-danger/30':'bg-kaptan-success/20 text-kaptan-success hover:bg-kaptan-success/30'} disabled:opacity-50`}>
                    {verifying===f.key?'...':f.value?'Kaldır':'Doğrula'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Accountant Info */}
          {profile.accountantName && <div className="kaptan-card p-6"><h3 className="font-bold text-kaptan-text mb-3">Muhasebeci</h3><div className="space-y-1 text-sm"><p className="text-kaptan-text">{profile.accountantName}</p>{profile.accountantEmail && <p className="text-kaptan-muted">{profile.accountantEmail}</p>}{profile.accountantPhone && <p className="text-kaptan-muted">{profile.accountantPhone}</p>}</div></div>}
        </div>

        {/* Sidebar: Scorecard */}
        <div className="space-y-4">
          {scorecard && (
            <div className="kaptan-card p-6 text-center">
              <Award size={32} className="mx-auto mb-2 text-kaptan-primary" />
              <p className={`text-3xl font-bold ${(scorecard.overallScore||0)>=80?'text-kaptan-success':(scorecard.overallScore||0)>=60?'text-kaptan-warning':'text-kaptan-danger'}`}>{scorecard.overallScore || 0}</p>
              <p className="text-kaptan-muted text-xs">Kalite Skoru • {scorecard.tierLabel || 'Seviye'}</p>
              <div className="grid grid-cols-2 gap-2 mt-4 text-center text-xs">
                <div className="p-2 bg-kaptan-dark rounded"><p className="text-kaptan-text font-bold">{scorecard.metrics?.totalCompletedLoads || 0}</p><p className="text-kaptan-muted">Yük</p></div>
                <div className="p-2 bg-kaptan-dark rounded"><p className="text-kaptan-text font-bold">%{(scorecard.metrics?.onTimeDeliveryPct || 0).toFixed(0)}</p><p className="text-kaptan-muted">Zamanında</p></div>
                <div className="p-2 bg-kaptan-dark rounded"><p className="text-kaptan-text font-bold">★ {(scorecard.metrics?.averageRating || 0).toFixed(1)}</p><p className="text-kaptan-muted">Puan</p></div>
                <div className="p-2 bg-kaptan-dark rounded"><p className="text-kaptan-text font-bold">%{(scorecard.metrics?.cancellationRate || 0).toFixed(0)}</p><p className="text-kaptan-muted">İptal</p></div>
              </div>
              {scorecard.restrictions?.escrowRequired && <div className="mt-3 p-2 bg-kaptan-danger/10 rounded text-kaptan-danger text-xs">⚠️ Escrow Zorunlu</div>}
            </div>
          )}

          <div className="kaptan-card p-6">
            <h3 className="font-bold text-kaptan-text mb-3 flex items-center gap-2"><Eye size={18} /> Hesap Özeti</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-kaptan-muted">Rol</span><span className="text-kaptan-text font-semibold">{profile.role}</span></div>
              <div className="flex justify-between"><span className="text-kaptan-muted">Profil</span><span className="text-kaptan-text">{profile.profileStatus || 'Eksik'}</span></div>
              <div className="flex justify-between"><span className="text-kaptan-muted">Kayıt</span><span className="text-kaptan-text text-xs">{profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('tr-TR') : '-'}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function D({ label, value }: { label: string; value: string }) {
  return <div className="p-3 bg-kaptan-dark rounded-lg"><p className="text-kaptan-muted text-xs">{label}</p><p className="text-kaptan-text text-sm font-semibold">{value}</p></div>;
}
