'use client';

import { ChevronDown } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface DropdownSelectProps {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function DropdownSelect({
  label, value, options, onChange, error, required, disabled,
  placeholder = 'Seçiniz...', className = '',
}: DropdownSelectProps) {
  const selected = options.find(o => o.value === value);

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="flex items-center gap-1 text-xs font-medium text-slate-400">
        {label}
        {required && <span className="text-red-400">*</span>}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          className={`w-full px-4 py-2.5 rounded-xl text-sm text-[var(--text)]
            outline-none transition-all duration-200 appearance-none cursor-pointer
            bg-white/[0.04] border
            ${error ? 'border-red-400' : 'border-[var(--glass-border)] hover:border-slate-500'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${!selected ? 'text-slate-600' : ''}`}
        >
          <option value="" disabled className="bg-slate-900 text-slate-600">
            {placeholder}
          </option>
          {options.map(o => (
            <option key={o.value} value={o.value} className="bg-slate-900 text-[var(--text)]">
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
