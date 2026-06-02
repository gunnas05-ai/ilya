'use client';

import { Check } from 'lucide-react';

interface CheckboxCardProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
  className?: string;
}

export function CheckboxCard({ label, description, checked, onChange, error, className = '' }: CheckboxCardProps) {
  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className="flex items-center gap-3 text-left w-full group"
      >
        <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border-2 transition-all duration-200
          ${checked
            ? 'bg-[#FF7A00] border-[#FF7A00] shadow-[0_0_8px_rgba(255,122,0,0.3)]'
            : 'border-slate-500 group-hover:border-[#FF7A00]/60 bg-white/[0.03]'
          }`}
        >
          {checked && <Check size={13} className="text-white" strokeWidth={3} />}
        </div>
        <span className={`text-sm transition-colors ${checked ? 'text-[var(--text)]' : 'text-slate-400'}`}>
          {label}
        </span>
      </button>
      {description && <p className="text-xs text-slate-500 mt-1 ml-8">{description}</p>}
      {error && <p className="text-xs text-red-400 mt-1.5 ml-8">{error}</p>}
    </div>
  );
}
