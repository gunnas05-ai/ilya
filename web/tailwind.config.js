/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        kaptan: {
          primary: '#FF7A00',
          'primary-light': '#FF9630',
          'primary-dark': '#E86300',
          dark: 'var(--bg)',
          card: 'var(--surface)',
          'card-elevated': 'var(--surface-elevated)',
          border: 'var(--border)',
          'border-light': 'var(--border-light)',
          text: 'var(--text)',
          muted: 'var(--text-secondary)',
          'text-muted': 'var(--text-muted)',
          'text-accent': 'var(--text-accent)',
          success: '#22C55E',
          warning: '#F59E0B',
          danger: '#EF4444',
          info: '#06B6D4',
          ftl: '#2563EB',
          ltl: '#8B5CF6',
          city: '#22C55E',
          moving: '#EC4899',
        },
      },
      fontSize: {
        'hero': ['42px', { fontWeight: '700', lineHeight: '48px' }],
        'hero-label': ['11px', { fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase' }],
        'section': ['18px', { fontWeight: '700', lineHeight: '24px' }],
        'card-title': ['16px', { fontWeight: '600', lineHeight: '22px' }],
        'card-value': ['24px', { fontWeight: '700', lineHeight: '30px' }],
        'price': ['20px', { fontWeight: '700', lineHeight: '26px' }],
        'body-sec': ['14px', { fontWeight: '400', lineHeight: '20px' }],
        'caption': ['12px', { fontWeight: '500', lineHeight: '16px' }],
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0, 0, 0, 0.3)',
        'glow-primary': '0 0 20px rgba(255, 107, 0, 0.15)',
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.12)',
        'glow-card': '0 0 20px rgba(59, 130, 246, 0.08)',
      },
      animation: {
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.25s ease-out',
        'sidebar-in': 'sidebarIn 0.2s ease-out',
        'shimmer': 'shimmer 1.5s infinite',
      },
      keyframes: {
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(59, 130, 246, 0.08)' },
          '50%': { boxShadow: '0 0 25px rgba(59, 130, 246, 0.18)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        sidebarIn: {
          from: { opacity: '0', transform: 'translateX(-16px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
