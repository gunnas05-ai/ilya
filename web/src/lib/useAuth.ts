'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';

/* ═══════════════════════════════════════════════════════════════
   KAPTAN WEB — Auth Hook (mobil authStore ile aynı pattern)
   localStorage + token yönetimi
   ═══════════════════════════════════════════════════════════════ */

interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  phone?: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
}

export function useAuth() {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null, token: null, refreshToken: null, isAuthenticated: false,
  });

  // Session restore (mobil restoreSession ile aynı)
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    const refresh = localStorage.getItem('admin_refresh');
    const userRaw = localStorage.getItem('admin_user');
    if (token && userRaw) {
      try {
        const user = JSON.parse(userRaw);
        setState({ user, token, refreshToken: refresh, isAuthenticated: true });
      } catch { logout(); }
    }
  }, []);

  const login = useCallback((token: string, refreshToken: string, user: AuthUser) => {
    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin_refresh', refreshToken);
    localStorage.setItem('admin_user', JSON.stringify(user));
    document.cookie = `admin_session=${token}; expires=${new Date(Date.now() + 7 * 86400000).toUTCString()}; path=/; SameSite=Lax`;
    setState({ user, token, refreshToken, isAuthenticated: true });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_refresh');
    localStorage.removeItem('admin_user');
    document.cookie = 'admin_session=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    setState({ user: null, token: null, refreshToken: null, isAuthenticated: false });
    router.push('/login');
  }, [router]);

  const hasRole = useCallback((role: string) => state.user?.role === role, [state.user]);

  return { ...state, login, logout, hasRole };
}
