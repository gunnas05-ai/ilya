/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['lucide-react'],
  async rewrites() {
    return [
      { source: '/api/:path*', destination: 'http://localhost:3000/api/:path*' },
    ];
  },
  // Faz-4: Security headers (CSP, XSS, clickjack, MIME sniffing, referrer)
  async headers() {
    return [
      // Statik asset'ler için cache
      { source: '/_next/static/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
      { source: '/(.*)\\.(png|jpg|jpeg|svg|ico|woff2?)', headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }] },
      // Tüm sayfalar için güvenlik header'ları
      { source: '/(.*)', headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' http://localhost:* ws://localhost:* https://*.kap-tan.com wss://*.kap-tan.com https://*.kaptanlojistik.com wss://*.kaptanlojistik.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" },
      ]},
    ];
  },
  // Faz-4: Image optimization + bundle analyzer
  images: { formats: ['image/avif', 'image/webp'] },
};

module.exports = nextConfig;
