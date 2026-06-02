'use client';

import { useState } from 'react';
import { Truck } from 'lucide-react';
import { formatPlate } from '@/lib/validations';

interface PlateInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function PlateInput({ value, onChange, error, required, disabled, className = '' }: PlateInputProps) {
  const [focused, setFocused] = useState(false);

  const handleChange = (raw: string) => {
    const clean = raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10);
    onChange(clean);
  };

  const display = formatPlate(value);

  const borderColor = error
    ? 'border-red-400 focus:ring-red-500/20'
    : value.length >= 6
    ? 'border-emerald-400 focus:ring-emerald-500/20'
    : focused
    ? 'border-blue-400 focus:ring-blue-500/20'
    : 'border-[var(--glass-border)] hover:border-slate-500';

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="flex items-center gap-1 text-xs font-medium text-slate-400">
        Plaka
        {required && <span className="text-red-400">*</span>}
      </label>
      <div className="relative">
        <Truck size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={display}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="34 ABC 123"
          maxLength={12}
          disabled={disabled}
          className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-[var(--text)] font-mono tracking-wide
            placeholder:text-slate-600 outline-none transition-all duration-200
            bg-white/[0.04] border ${borderColor} focus:ring-2
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
