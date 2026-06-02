'use client';

import { useState } from 'react';

interface MoneyInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function MoneyInput({
  label, value, onChange, error, required, disabled,
  placeholder = '0,00', className = '',
}: MoneyInputProps) {
  const [focused, setFocused] = useState(false);

  const formatMoney = (raw: string): string => {
    const digits = raw.replace(/[^0-9]/g, '');
    if (!digits) return '';
    const number = parseInt(digits, 10) / 100;
    return number.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleChange = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, '');
    onChange(digits);
  };

  const display = formatMoney(value);

  const borderColor = error
    ? 'border-red-400 focus:ring-red-500/20'
    : focused
    ? 'border-blue-400 focus:ring-blue-500/20'
    : 'border-[var(--glass-border)] hover:border-slate-500';

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="flex items-center gap-1 text-xs font-medium text-slate-400">
        {label}
        {required && <span className="text-red-400">*</span>}
      </label>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-medium text-sm">₺</span>
        <input
          type="text"
          inputMode="decimal"
          value={display}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full pl-8 pr-4 py-2.5 rounded-xl text-sm text-[var(--text)] text-right font-mono
            placeholder:text-slate-600 outline-none transition-all duration-200
            bg-white/[0.04] border ${borderColor} focus:ring-2
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {value && !error && (
        <p className="text-xs text-slate-500 text-right">
          {formatMoney(value)} TL
        </p>
      )}
    </div>
  );
}
