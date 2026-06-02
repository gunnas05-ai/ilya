'use client';

import './globals.css';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/queryClient';
import { Sidebar } from '@/components/sidebar';
import { TopNavbar } from '@/components/top-navbar';
import { ToastContainer } from '@/components/toast';
import { useKeyboardNav } from '@/lib/useKeyboardNav';
import { initOfflineQueue } from '@/lib/offlineQueue';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useKeyboardNav();
  const pathname = usePathname() || '/';
  const router = useRouter();
  const [isAuth, setIsAuth] = useState(false);
  const [checked, setChecked] = useState(false);
  const [queryClient] = useState(() => getQueryClient());
  const portalRoutes = ['/', '/login']; const isPortal = portalRoutes.includes(pathname);

  useEffect(() => {
    if (typeof window === 'undefined') { setChecked(true); return; }
    const t = localStorage.getItem('admin_token');
    if (!t && !isPortal) router.push('/login');
    setIsAuth(!!t);
    setChecked(true);
    initOfflineQueue();
  }, [pathname]);

  if (!checked) return <html lang="tr"><body>{children}</body></html>;

  return (
    <html lang="tr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className={isPortal ? '' : 'flex h-screen overflow-hidden bg-kaptan-dark'}>
        <QueryClientProvider client={queryClient}>
          {isPortal ? (
            <>{children}</>
          ) : isAuth ? (
            <>
              <Sidebar />
              <div className="flex flex-col flex-1 min-w-0">
                <TopNavbar />
                <main className="flex-1 overflow-auto p-6 animate-fade-in">
                  {children}
                </main>
              </div>
            </>
          ) : (
            <main className="flex-1 flex items-center justify-center">
              <p className="text-slate-500">Yönlendiriliyor...</p>
            </main>
          )}
          <ToastContainer />
        </QueryClientProvider>
      </body>
    </html>
  );
}
