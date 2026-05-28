'use client';

import './globals.css';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/sidebar';
import { useKeyboardNav } from '@/lib/useKeyboardNav';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useKeyboardNav();
  const pathname = usePathname() || '/';
  const router = useRouter();
  const [isAuth, setIsAuth] = useState(false);
  const [checked, setChecked] = useState(false);

  // Portal routes: no sidebar
  const portalRoutes = ['/', '/login'];
  const isPortal = portalRoutes.includes(pathname);

  useEffect(() => {
    // Build/server tarafinda localStorage yok
    if (typeof window === 'undefined') { setChecked(true); return; }

    const token = localStorage.getItem('admin_token');
    if (!token && !portalRoutes.includes(pathname)) {
      router.push('/login');
    }
    setIsAuth(!!token);
    setChecked(true);
  }, [pathname]);

  if (!checked) return <html lang="tr"><body>{children}</body></html>;

  return (
    <html lang="tr">
      <body className={isPortal ? '' : 'flex h-screen overflow-hidden bg-kaptan-dark'}>
        {isPortal ? (
          <>{children}</>
        ) : isAuth ? (
          <>
            <Sidebar />
            <main className="flex-1 overflow-auto p-6">{children}</main>
          </>
        ) : (
          <main className="flex-1 flex items-center justify-center">
            <p className="text-kaptan-muted">Yönlendiriliyor...</p>
          </main>
        )}
      </body>
    </html>
  );
}
