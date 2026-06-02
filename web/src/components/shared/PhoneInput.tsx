'use client';

import { useState } from 'react';
import { Phone } from 'lucide-react';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function PhoneInput({ value, onChange, error, required, disabled, className = '' }: PhoneInputProps) {
  const [focused, setFocused] = useState(false);

  const formatPhone = (raw: string): string => {
    const digits = raw.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}(${digits.slice(2)}`;
    if (digits.length <= 7) return `${digits.slice(0, 2)}(${digits.slice(2, 5)}) ${digits.slice(5)}`;
    return `${digits.slice(0, 2)}(${digits.slice(2, 5)}) ${digits.slice(5, 8)} ${digits.slice(8)}`;
  };

  const handleChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 11);
    onChange(digits);
  };

  const display = formatPhone(value);

  const borderColor = error
    ? 'border-red-400 focus:ring-red-500/20'
    : focused
    ? 'border-blue-400 focus:ring-blue-500/20'
    : 'border-[var(--glass-border)] hover:border-slate-500';

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="flex items-center gap-1 text-xs font-medium text-slate-400">
        Telefon
        {required && <span className="text-red-400">*</span>}
      </label>
      <div className="relative">
        <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="tel"
          value={display}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="05xx xxx xx xx"
          disabled={disabled}
          className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-[var(--text)]
            placeholder:text-slate-600 outline-none transition-all duration-200
            bg-white/[0.04] border ${borderColor} focus:ring-2
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
        {value.length === 11 && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-400" />
        )}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
