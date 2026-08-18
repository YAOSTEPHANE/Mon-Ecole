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
      className={`flex flex-wrap gap-1 rounded-full p-1 ${
        isDark
          ? 'bg-slate-950/90 ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
          : 'bg-[#f4f5f9] ring-1 ring-[#e4e8f2]'
      }`}
    >
      {items.map(({ id, label, icon: Icon }) => {
        const selected = active === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${
              selected
                ? isDark
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'bg-[#0018A8] text-white shadow-sm'
                : isDark
                  ? 'text-slate-400 hover:bg-white/10 hover:text-white'
                  : 'text-stone-500 hover:bg-white hover:text-stone-800'
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
