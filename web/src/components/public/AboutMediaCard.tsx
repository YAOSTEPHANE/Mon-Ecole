'use client';

import Image from 'next/image';
import Link from 'next/link';
import HomePageImage from './HomePageImage';
import type { HomePageImageSlot } from '@/lib/homePageImages.types';

type AboutMediaCardProps = {
  src: string;
  alt: string;
  slot?: HomePageImageSlot;
  eyebrow?: string;
  title: string;
  text?: string;
  href?: string;
  className?: string;
  minHeightClass?: string;
  children?: React.ReactNode;
};

export default function AboutMediaCard({
  src,
  alt,
  slot,
  eyebrow,
  title,
  text,
  href,
  className = '',
  minHeightClass = 'min-h-[22rem] sm:min-h-[26rem]',
  children,
}: AboutMediaCardProps) {
  const inner = (
    <>
      {slot ? (
        <HomePageImage
          slot={slot}
          defaultPath={src}
          alt={alt}
          fill
          className="object-cover transition duration-700 ease-out group-hover:scale-[1.06]"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      ) : (
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover transition duration-700 ease-out group-hover:scale-[1.06]"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      )}
      <div
        className="absolute inset-0 bg-gradient-to-t from-[#07081a] via-[#07081a]/55 to-[#07081a]/10"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-40 mix-blend-soft-light"
        aria-hidden
        style={{
          background:
            'linear-gradient(120deg, transparent 40%, rgba(235,176,45,0.18) 72%, transparent 100%)',
        }}
      />
      <div className="relative z-10 mt-auto p-5 text-white sm:p-7">
        {eyebrow ? (
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-tran-mustard-200">
            {eyebrow}
          </p>
        ) : null}
        <h3 className="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-[1.65rem]">
          {title}
        </h3>
        {text ? <p className="mt-2 max-w-md text-sm leading-relaxed text-stone-200/95">{text}</p> : null}
        {children}
      </div>
    </>
  );

  const cls = `group relative flex flex-col overflow-hidden rounded-[1.75rem] shadow-[0_28px_56px_-28px_rgba(7,8,26,0.55)] ring-1 ring-white/10 ${minHeightClass} ${className}`;

  if (href) {
    return (
      <Link href={href} className={cls}>
        {inner}
      </Link>
    );
  }

  return <article className={cls}>{inner}</article>;
}
