/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        kaptan: {
          primary: '#FF6B00',
          'primary-light': '#FF8A3D',
          'primary-dark': '#E05500',
          dark: 'var(--bg)',
          card: 'var(--surface)',
          'card-elevated': 'var(--surface-elevated)',
          border: 'var(--border)',
          'border-light': 'var(--border-light)',
          text: 'var(--text)',
          muted: 'var(--text-secondary)',
          'text-muted': 'var(--text-muted)',
          'text-accent': 'var(--text-accent)',
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
          info: '#3B82F6',
          ftl: '#3B82F6',
          ltl: '#8B5CF6',
          city: '#10B981',
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
    },
  },
  plugins: [],
};
