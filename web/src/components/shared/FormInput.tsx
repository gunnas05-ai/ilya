'use client';

import { useState } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface FormInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  success?: boolean;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'url';
  multiline?: boolean;
  maxLength?: number;
  className?: string;
}

export function FormInput({
  label, value, onChange, error, success, required, disabled,
  placeholder, type = 'text', multiline, maxLength, className = '',
}: FormInputProps) {
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? 'border-red-400 focus:ring-red-500/20'
    : success
    ? 'border-emerald-400 focus:ring-emerald-500/20'
    : focused
    ? 'border-[#FF7A00] focus:ring-[#FF7A00]/20'
    : 'border-[var(--glass-border)] hover:border-slate-500';

  const inputClass = `w-full px-4 py-2.5 rounded-xl text-sm text-[var(--text)]
    placeholder:text-slate-600 outline-none transition-all duration-200
    bg-white/[0.04] border ${borderColor} focus:ring-2
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="flex items-center gap-1 text-xs font-medium text-slate-400">
        {label}
        {required && <span className="text-red-400">*</span>}
      </label>
      <div className="relative">
        {multiline ? (
          <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={placeholder}
            maxLength={maxLength}
            disabled={disabled}
            className={inputClass + ' resize-none'}
            rows={4}
          />
        ) : (
          <input
            type={type}
            value={value}
            onChange={e => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={placeholder}
            maxLength={maxLength}
            disabled={disabled}
            className={inputClass}
          />
        )}
        {success && !error && (
          <CheckCircle size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400" />
        )}
        {error && (
          <AlertCircle size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400" />
        )}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {maxLength && (
        <p className="text-xs text-slate-600 text-right">{value.length}/{maxLength}</p>
      )}
    </div>
  );
}
