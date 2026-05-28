import { TextStyle } from 'react-native';

// KAPTAN Lojistik — Tipografi Sistemi (onespace.md)
// Kaynak: D:\Proje\01\kod\constants\theme.ts

export const typography: Record<string, TextStyle> = {
  // ── Hero / Dashboard ──
  heroValue: {
    fontSize: 42,
    fontWeight: '700',
    lineHeight: 48,
    color: '#FFFFFF',
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
    color: '#8B9DC3',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // ── Basliklar ──
  display: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  h1: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 36,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },

  // ── Degerler ──
  cardValue: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
  },
  statsValue: {
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
    color: '#FF6B00',
  },
  priceSmall: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
    color: '#FF6B00',
  },

  // ── Govde metinleri ──
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 22,
  },
  body2: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  bodySecondary: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },

  // ── Etiket / Caption ──
  title: {
    fontSize: 18,
    fontWeight: '500',
    lineHeight: 24,
  },
  subtitle2: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
  },
  small: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  statsLabel: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ── Bilesen ──
  button: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
    letterSpacing: 0.8,
  },
};
