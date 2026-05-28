'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { LogIn, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('ilyas_duran@hotmail.com');
  const [password, setPassword] = useState('Alp5326741416');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const token = res.data?.data?.accessToken;
      const refreshToken = res.data?.data?.refreshToken;
      const user = res.data?.data?.user;
      if (token) {
        localStorage.setItem('admin_token', token);
        if (refreshToken) localStorage.setItem('admin_refresh', refreshToken);
        if (user) localStorage.setItem('admin_user', JSON.stringify(user));
        router.push('/admin');
      } else {
        setError('Token alınamadı. Lütfen tekrar deneyin.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.data?.message || 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-kaptan-dark">
      <div className="w-full max-w-md bg-kaptan-card border border-kaptan-border rounded-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-kaptan-primary tracking-wider">KAPTAN</h1>
          <p className="text-kaptan-muted text-sm mt-2">Yönetim Paneli</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm text-kaptan-muted mb-1">E-Posta</label>
            <input
              className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-4 py-2.5 text-kaptan-text placeholder-kaptan-muted"
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="ilyas_duran@hotmail.com" required
            />
          </div>
          <div>
            <label className="block text-sm text-kaptan-muted mb-1">Şifre</label>
            <div className="relative">
              <input
                className="w-full bg-kaptan-dark border border-kaptan-border rounded-lg px-4 py-2.5 pr-11 text-kaptan-text placeholder-kaptan-muted"
                type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••" required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-kaptan-muted hover:text-kaptan-text transition-colors"
                aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          {error && (
            <p className="text-kaptan-danger text-sm bg-kaptan-danger/10 px-3 py-2 rounded-lg">{error}</p>
          )}
          <button
            type="submit" disabled={loading}
            className="w-full bg-kaptan-primary text-white rounded-lg py-3 font-semibold flex items-center justify-center gap-2 hover:bg-kaptan-primary/90 disabled:opacity-50 transition-colors"
          >
            <LogIn size={18} /> {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
        <p className="text-center text-xs text-kaptan-muted mt-6">
          Süper Admin: ilyas_duran@hotmail.com
        </p>
      </div>
    </div>
  );
}
