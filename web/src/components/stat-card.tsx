import { LucideIcon } from 'lucide-react';

interface Props {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
}

export function StatCard({ title, value, icon: Icon, color }: Props) {
  return (
    <div className="bg-kaptan-card border border-kaptan-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-kaptan-muted">{title}</span>
        <Icon size={20} className={color} />
      </div>
      <div className="text-2xl font-bold text-kaptan-text">{value}</div>
    </div>
  );
}
