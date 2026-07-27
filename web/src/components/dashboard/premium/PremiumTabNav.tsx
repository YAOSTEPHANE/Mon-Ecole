'use client';

import type { IconType } from 'react-icons';

export type PremiumTabItem<T extends string> = {
  id: T;
  label: string;
  icon: IconType;
};

type PremiumTabNavProps<T extends string> = {
  items: PremiumTabItem<T>[];
  active: T;
  onChange: (id: T) => void;
  variant?: 'dark' | 'light';
};

export default function PremiumTabNav<T extends string>({
  items,
  active,
  onChange,
  variant = 'dark',
}: PremiumTabNavProps<T>) {
  const isDark = variant === 'dark';

  return (
    <div
      className={`flex flex-wrap gap-1.5 rounded-2xl p-1.5 shadow-xl ring-1 ${
        isDark
          ? 'bg-gradient-to-b from-slate-950 to-[#0c0f1a] ring-white/10 backdrop-blur-xl'
          : 'bg-white/90 ring-stone-200/70 shadow-dash-card backdrop-blur-xl'
      }`}
    >
      {items.map(({ id, label, icon: Icon }) => {
        const selected = active === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-300 ease-premium ${
              selected
                ? isDark
                  ? 'bg-white text-slate-900 shadow-lg shadow-black/25 ring-1 ring-cptb-gold/30'
                  : 'bg-gradient-to-r from-cptb-blue to-cptb-blue-dark text-white shadow-md shadow-cptb-blue/30 ring-1 ring-white/20'
                : isDark
                  ? 'text-slate-400 hover:bg-white/10 hover:text-white'
                  : 'text-stone-600 hover:bg-stone-100/90 hover:text-stone-900'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}
