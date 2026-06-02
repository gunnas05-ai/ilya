'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Shield, CheckCircle, Copy, Save } from 'lucide-react';

const DANGER_PERMS = ['admin:manage_settings', 'admin:delete_users', 'admin:view_panel'];

export default function PermissionMatrixPage() {
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [rolePerms, setRolePerms] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/admin/roles').catch(()=>({data:{data:[]}})),
      api.get('/admin/roles/permissions').catch(()=>({data:{data:[]}})),
    ]).then(([rRes, pRes]) => {
      const rList = rRes.data?.data || rRes.data || [];
      const pList = pRes.data?.data || pRes.data || [];
      setRoles(Array.isArray(rList) ? rList.map((r:any)=>r.key||r.role||r) : []);
      setPermissions(Array.isArray(pList) ? pList : []);
      if (rList[0]) {
        const firstRole = rList[0].key || rList[0].role || rList[0];
        setSelectedRole(firstRole);
        setRolePerms(new Set(rList[0].permissions || rList[0].permKeys || []));
      }
      setLoading(false);
    });
  }, []);

  const handleRoleChange = (role: string) => {
    setSelectedRole(role);
    api.get(`/admin/roles/${role}/permissions`).then(r => {
      const perms = r.data?.data?.permissions || r.data?.data || [];
      setRolePerms(new Set(Array.isArray(perms) ? perms : []));
    }).catch(() => setRolePerms(new Set()));
  };

  const togglePerm = (key: string) => {
    setRolePerms(prev => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post(`/admin/roles/${selectedRole}/permissions`, { permissionKeys: Array.from(rolePerms) });
      alert('Yetkiler kaydedildi!');
    } catch { alert('Kaydetme başarısız'); }
    setSaving(false);
  };

  const groups = permissions.reduce((acc: any, p: any) => {
    const g = p.group || 'Diğer';
    if (!acc[g]) acc[g] = [];
    acc[g].push(p);
    return acc;
  }, {});

  if (loading) return <div className="p-6 space-y-4"><div className="h-8 bg-kaptan-card animate-pulse rounded w-1/3" /><div className="h-96 bg-kaptan-card animate-pulse rounded" /></div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-kaptan-text flex items-center gap-2"><Shield size={28} className="text-kaptan-primary" /> Yetki Matrisi</h1>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {roles.map((r: string) => <button key={r} onClick={()=>handleRoleChange(r)} className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap ${selectedRole===r?'bg-kaptan-primary text-white':'bg-kaptan-card text-kaptan-muted'}`}>{r}</button>)}
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-kaptan-success text-white rounded-lg text-sm font-semibold disabled:opacity-50"><Save size={14} /> {saving?'Kaydediliyor...':'Kaydet'}</button>
        <button onClick={() => { const target = prompt('Hedef rol key girin:'); if (target) { api.post('/admin/roles/permissions/clone', { fromRoleKey: selectedRole, toRoleKey: target }).then(() => alert('Klonlandı!')).catch(() => alert('Başarısız')); } }} className="flex items-center gap-2 px-4 py-2 bg-kaptan-info/20 text-kaptan-info rounded-lg text-sm font-semibold"><Copy size={14} /> Klonla</button>
      </div>

      <div className="space-y-4">
        {Object.entries(groups).map(([group, perms]: any) => {
          const selected = perms.filter((p:any) => rolePerms.has(p.key || p.permissionKey));
          return (
            <div key={group} className="kaptan-card p-4">
              <h3 className="font-bold text-kaptan-text mb-3">{group} ({selected.length}/{perms.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {perms.map((p: any) => {
                  const key = p.key || p.permissionKey;
                  const active = rolePerms.has(key);
                  const isDanger = DANGER_PERMS.includes(key);
                  return (
                    <button key={key} onClick={()=>togglePerm(key)} className={`flex items-center justify-between p-2.5 rounded-lg text-left text-sm transition border ${active ? (isDanger?'bg-kaptan-danger/10 border-kaptan-danger/30 text-kaptan-danger':'bg-kaptan-success/10 border-kaptan-success/30 text-kaptan-success') : 'bg-kaptan-dark border-transparent text-kaptan-muted'}`}>
                      <span className="text-xs">{key}</span>
                      {active && <CheckCircle size={14} />}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
