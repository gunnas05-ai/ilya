'use client';

import { useState } from 'react';
import { CheckCircle, Shield } from 'lucide-react';

// TC Kimlik No checksum validation (11-digit algorithm)
function validateTC(tc: string): boolean {
  if (!/^\d{11}$/.test(tc)) return false;
  if (tc[0] === '0') return false;
  const digits = tc.split('').map(Number);
  const sumFirst10 = digits.slice(0, 10).reduce((a, b) => a + b, 0);
  const sumOdd = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const sumEven = digits[1] + digits[3] + digits[5] + digits[7];
  const digit10 = (sumOdd * 7 - sumEven) % 10;
  if (digit10 !== digits[9]) return false;
  const digit11 = sumFirst10 % 10;
  return digit11 === digits[10];
}

interface TCInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function TCInput({ value, onChange, error, required, disabled, className = '' }: TCInputProps) {
  const [focused, setFocused] = useState(false);
  const isValid = value.length === 11 && validateTC(value);

  const borderColor = error
    ? 'border-red-400 focus:ring-red-500/20'
    : isValid
    ? 'border-emerald-400 focus:ring-emerald-500/20'
    : focused
    ? 'border-blue-400 focus:ring-blue-500/20'
    : 'border-[var(--glass-border)] hover:border-slate-500';

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="flex items-center gap-1 text-xs font-medium text-slate-400">
        TC Kimlik No
        {required && <span className="text-red-400">*</span>}
      </label>
      <div className="relative">
        <Shield size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 11))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="12345678901"
          maxLength={11}
          disabled={disabled}
          className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-[var(--text)]
            placeholder:text-slate-600 outline-none transition-all duration-200
            bg-white/[0.04] border ${borderColor} focus:ring-2
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
        {isValid && (
          <CheckCircle size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400" />
        )}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {isValid && !error && <p className="text-xs text-emerald-500">Geçerli TC Kimlik No</p>}
    </div>
  );
}
