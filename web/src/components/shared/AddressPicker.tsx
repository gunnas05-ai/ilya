'use client';

import { MapPin } from 'lucide-react';

interface AddressPickerProps {
  cityLabel?: string;
  districtLabel?: string;
  cityValue: string;
  districtValue: string;
  onCityChange: (city: string) => void;
  onDistrictChange: (district: string) => void;
  error?: string;
  required?: boolean;
  className?: string;
}

// İller ve ilçeler (Türkiye)
const cityList = [
  'İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Adana', 'Konya',
  'Gaziantep', 'Mersin', 'Kayseri', 'Eskişehir', 'Denizli', 'Samsun',
  'Trabzon', 'Erzurum', 'Diyarbakır', 'Malatya', 'Kocaeli', 'Sakarya',
  'Tekirdağ', 'Manisa', 'Balıkesir', 'Aydın', 'Muğla', 'Hatay',
];

const districtMap: Record<string, string[]> = {
  'İstanbul': ['Kadıköy', 'Beşiktaş', 'Üsküdar', 'Pendik', 'Tuzla', 'Bakırköy', 'Beylikdüzü', 'Maltepe', 'Kartal', 'Sarıyer'],
  'Ankara': ['Çankaya', 'Keçiören', 'Yenimahalle', 'Mamak', 'Sincan', 'Etimesgut', 'Gölbaşı', 'Polatlı'],
  'İzmir': ['Konak', 'Karşıyaka', 'Bornova', 'Buca', 'Çiğli', 'Gaziemir', 'Balçova', 'Narlıdere'],
  'Bursa': ['Osmangazi', 'Nilüfer', 'Yıldırım', 'Gemlik', 'Mudanya', 'İnegöl'],
  'Antalya': ['Muratpaşa', 'Kepez', 'Konyaaltı', 'Alanya', 'Manavgat', 'Serik'],
  'Adana': ['Seyhan', 'Çukurova', 'Yüreğir', 'Ceyhan'],
  'Konya': ['Selçuklu', 'Meram', 'Karatay', 'Ereğli'],
  'Kocaeli': ['İzmit', 'Gebze', 'Darıca', 'Körfez'],
};

export function AddressPicker({
  cityLabel = 'İl', districtLabel = 'İlçe',
  cityValue, districtValue, onCityChange, onDistrictChange,
  error, required, className = '',
}: AddressPickerProps) {
  const districts = districtMap[cityValue] || [];

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="flex items-center gap-1 text-xs font-medium text-slate-400">
        <MapPin size={12} /> {cityLabel} / {districtLabel}
        {required && <span className="text-red-400">*</span>}
      </label>
      <div className="flex gap-2">
        <select
          value={cityValue}
          onChange={e => { onCityChange(e.target.value); onDistrictChange(''); }}
          className="flex-1 px-3 py-2.5 rounded-xl text-sm text-[var(--text)]
            bg-white/[0.04] border border-[var(--glass-border)]
            outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20
            appearance-none cursor-pointer transition-all"
        >
          <option value="" className="bg-slate-900">İl seçin</option>
          {cityList.map(c => (
            <option key={c} value={c} className="bg-slate-900">{c}</option>
          ))}
        </select>
        <select
          value={districtValue}
          onChange={e => onDistrictChange(e.target.value)}
          disabled={!cityValue || districts.length === 0}
          className="flex-1 px-3 py-2.5 rounded-xl text-sm text-[var(--text)]
            bg-white/[0.04] border border-[var(--glass-border)]
            outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20
            appearance-none cursor-pointer transition-all
            disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <option value="" className="bg-slate-900">İlçe seçin</option>
          {districts.map(d => (
            <option key={d} value={d} className="bg-slate-900">{d}</option>
          ))}
        </select>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
