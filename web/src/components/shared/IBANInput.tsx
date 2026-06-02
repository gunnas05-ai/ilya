'use client';

import { useState } from 'react';
import { Landmark } from 'lucide-react';
import { formatIBAN } from '@/lib/validations';

interface IBANInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function IBANInput({ value, onChange, error, required, disabled, className = '' }: IBANInputProps) {
  const [focused, setFocused] = useState(false);

  const handleChange = (raw: string) => {
    const clean = raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 28);
    onChange(clean);
  };

  const display = formatIBAN(value);

  const borderColor = error
    ? 'border-red-400 focus:ring-red-500/20'
    : value.length === 26
    ? 'border-emerald-400 focus:ring-emerald-500/20'
    : focused
    ? 'border-blue-400 focus:ring-blue-500/20'
    : 'border-[var(--glass-border)] hover:border-slate-500';

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="flex items-center gap-1 text-xs font-medium text-slate-400">
        IBAN
        {required && <span className="text-red-400">*</span>}
      </label>
      <div className="relative">
        <Landmark size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={display}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="TR00 0000 0000 0000 0000 0000 00"
          maxLength={34}
          disabled={disabled}
          className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-[var(--text)] font-mono
            placeholder:text-slate-600 outline-none transition-all duration-200
            bg-white/[0.04] border ${borderColor} focus:ring-2
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
