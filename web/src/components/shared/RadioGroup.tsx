'use client';

interface Option {
  value: string;
  label: string;
}

interface RadioGroupProps {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  className?: string;
}

export function RadioGroup({
  label, value, options, onChange, error, required, className = '',
}: RadioGroupProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <label className="flex items-center gap-1 text-xs font-medium text-slate-400">
        {label}
        {required && <span className="text-red-400">*</span>}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map(o => {
          const active = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border
                ${active
                  ? 'bg-blue-500/15 text-blue-400 border-blue-400/40 shadow-[0_0_12px_rgba(59,130,246,0.15)]'
                  : 'text-slate-400 border-[var(--glass-border)] hover:border-slate-500 hover:text-[var(--text)]'
                }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
