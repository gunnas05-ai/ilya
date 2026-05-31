import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public routes that don't require authentication
const PUBLIC_PATHS = ['/', '/login'];

// Routes that require admin-level access
const ADMIN_PATHS = [
  '/admin', '/admins', '/audit', '/settings', '/users',
  '/commission', '/monitoring', '/revenue',
  '/loads', '/bids', '/tracking', '/analytics', '/finance',
  '/escrow', '/wallet', '/payment', '/chat', '/whatsapp',
  '/marketplace', '/integrations', '/documents', '/pod',
  '/fuel-stations', '/restaurants', '/warehouse',
  '/carrier-api', '/shipper-api', '/gib', '/billing',
  '/notifications', '/announcements', '/qr',
  '/part-market', '/vehicles', '/return-loads',
  '/carrier-profiles', '/carrier-quality', '/rates',
  '/reloads', '/odeme', '/uetds', '/erp', '/customs',
  '/white-label', '/matching',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths without auth
  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith('/login'))) {
    return NextResponse.next();
  }

  // Check for session token in cookies (set by API interceptor on login)
  const sessionToken = request.cookies.get('admin_session')?.value;

  if (!sessionToken) {
    // For admin-only routes, redirect to login
    if (ADMIN_PATHS.some(p => pathname.startsWith(p))) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.png|api).*)',
  ],
};
