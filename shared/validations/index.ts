/* ═══════════════════════════════════════════════════════════════
   KAPTAN PLATFORMU — Shared Validation Helpers (Zod-free)
   Regex + format helpers — Zod schemaları platform bazında tanımlanır
   ═══════════════════════════════════════════════════════════════ */

/* ── Turkish-specific regex patterns ────────────────────────── */

export const phoneRegex = /^05\d{9}$/;
export const plateRegex = /^0[1-9]\d[A-Z]{1,3}\d{2,5}$/;
export const tcKimlikRegex = /^[1-9]\d{10}$/;
export const ibanRegex = /^TR\d{2}[A-Z0-9]{1,26}$/;
export const taxNoRegex = /^\d{10}$/;
export const postalCodeRegex = /^\d{5}$/;

/* ── Turkish-specific validators ────────────────────────────── */

/** TC Kimlik No checksum (11-digit algorithm) */
export function validateTCKimlik(tc: string): boolean {
  if (!tcKimlikRegex.test(tc) || tc[0] === '0') return false;
  const d = tc.split('').map(Number);
  const d10 = (d[0] * 7 + d[2] * 7 + d[4] * 7 + d[6] * 7 + d[8] * 7 - (d[1] + d[3] + d[5] + d[7])) % 10;
  if (d10 !== d[9]) return false;
  return (d.slice(0, 10).reduce((a, b) => a + b, 0) % 10) === d[10];
}

/* ── Turkish-specific formatters ────────────────────────────── */

/** IBAN: TR00 0000 0000 0000 0000 0000 00 */
export function formatIBAN(raw: string): string {
  const clean = raw.replace(/\s/g, '').toUpperCase();
  return clean.replace(/(.{4})/g, '$1 ').trim();
}

/** Plaka: 34 ABC 123 */
export function formatPlate(raw: string): string {
  const clean = raw.replace(/\s/g, '').toUpperCase();
  const m = clean.match(/^(\d{2})([A-Z]{1,3})(\d+)$/);
  return m ? `${m[1]} ${m[2]} ${m[3]}` : clean;
}

/** Telefon: 05xx xxx xx xx */
export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}(${digits.slice(2)}`;
  if (digits.length <= 7) return `${digits.slice(0, 2)}(${digits.slice(2, 5)}) ${digits.slice(5)}`;
  return `${digits.slice(0, 2)}(${digits.slice(2, 5)}) ${digits.slice(5, 8)} ${digits.slice(8)}`;
}

/** Para: 123456 → 1.234,56 ₺ */
export function formatMoney(amountInKurus: string | number): string {
  const kurus = typeof amountInKurus === 'string' ? parseInt(amountInKurus, 10) || 0 : amountInKurus;
  const tl = kurus / 100;
  return tl.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
}
