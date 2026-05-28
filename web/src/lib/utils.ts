export function safeText(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    return value?.nameTr || value?.nameEn || value?.name || value?.title || value?.label || value?.displayName || String(value);
  }
  return String(value);
}
