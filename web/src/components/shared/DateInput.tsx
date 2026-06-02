'use client';

import { Calendar } from 'lucide-react';

interface DateInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  min?: string;
  max?: string;
  className?: string;
}

export function DateInput({
  label, value, onChange, error, required, disabled,
  min, max, className = '',
}: DateInputProps) {
  // Display in TR format, store as ISO
  const display = value ? new Date(value).toLocaleDateString('tr-TR') : '';

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="flex items-center gap-1 text-xs font-medium text-slate-400">
        {label}
        {required && <span className="text-red-400">*</span>}
      </label>
      <div className="relative">
        <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        <input
          type="date"
          value={value ? value.slice(0, 10) : ''}
          onChange={e => onChange(e.target.value ? new Date(e.target.value).toISOString() : '')}
          min={min}
          max={max}
          disabled={disabled}
          className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-[var(--text)]
            outline-none transition-all duration-200
            bg-white/[0.04] border
            ${error ? 'border-red-400' : 'border-[var(--glass-border)] hover:border-slate-500'}
            focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            [color-scheme:dark]`}
        />
      </div>
      {display && !error && (
        <p className="text-xs text-slate-500">{display}</p>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
