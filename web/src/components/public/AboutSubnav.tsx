'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ABOUT_NAV } from '@/data/schoolAbout';

type AboutSubnavProps = {
  overlapping?: boolean;
};

export default function AboutSubnav({ overlapping = false }: AboutSubnavProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Sections À propos"
      className={
        overlapping
          ? 'sticky top-[3.25rem] z-20 -mt-8 px-3 sm:top-[3.6rem] sm:-mt-10 sm:px-6'
          : 'sticky top-[3.25rem] z-20 border-b border-stone-200/80 bg-white/92 shadow-sm backdrop-blur-md sm:top-[3.6rem]'
      }
    >
      <div
        className={
          overlapping
            ? 'mx-auto flex max-w-4xl gap-1 overflow-x-auto rounded-full border border-white/50 bg-white/90 p-1.5 shadow-[0_24px_60px_-24px_rgba(7,8,26,0.55)] backdrop-blur-xl sm:justify-center'
            : 'mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 py-2 sm:justify-center sm:px-6'
        }
      >
        {ABOUT_NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                active
                  ? 'whitespace-nowrap rounded-full bg-[#07081a] px-3.5 py-2 text-xs font-bold text-white shadow-md sm:text-sm'
                  : 'whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold text-stone-600 transition-colors hover:bg-tran-mustard-50 hover:text-tran-mustard-950 sm:text-sm'
              }
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
